import {
  CampusBundle,
  CampusBundleMetadata,
  CAMPUS_BUNDLE_SCHEMA_VERSION,
  ValidationResult,
  ValidationIssue,
  ImportCampusOptions,
  ImportCampusResult,
  ImportPreviewResult,
  ImportPreviewDiff,
} from '../types/import-export';
import { campusService } from './campus.service';
import { objectStore } from './object.store';
import { objectTypeService } from './object-type.service';
import { navStore } from './nav.store';
import { accessRuleService } from './access-rule.service';
import { authGuard } from './auth-guard';
import { auditService } from './audit.service';
import { securityValidation } from '../utils/security-validation';
import { transactionService } from './transaction.service';
import { ValidationError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export type { ImportCampusOptions, ImportCampusResult };

// Map editor layouts can contain embedded blueprint artwork, so a portable
// campus backup needs room for more than just its relational records.
const MAX_IMPORT_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

function replaceMappedIds(value: unknown, idMap: Map<string, string>): unknown {
  if (typeof value === 'string') {
    let result = value;
    for (const [from, to] of idMap) result = result.split(from).join(to);
    return result;
  }
  if (Array.isArray(value)) return value.map(item => replaceMappedIds(item, idMap));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceMappedIds(item, idMap)]));
  }
  return value;
}

/**
 * CampusImportExportService
 *
 * Handles full campus export to JSON and import with schema validation,
 * preview diffing, and multi-tenant data isolation.
 *
 * Safety rules:
 *  - NEVER exports credentials, auth tokens, or user passwords.
 *  - Export is fully self-contained and portable, including complete geometry,
 *    object types, floor transitions, and graph connections.
 *  - Import validates schema, detects duplicates, verifies geometry/cross-references, and isolates IDs.
 *  - Uses transactionService to ensure failed imports leave state 100% untouched.
 */
export class CampusImportExportService {
  private static instance: CampusImportExportService;
  private constructor() {}

  public static getInstance(): CampusImportExportService {
    if (!this.instance) this.instance = new CampusImportExportService();
    return this.instance;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPORT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Export a complete campus to a portable CampusBundle JSON.
   * Does NOT include any auth data, user accounts, or private credentials.
   */
  public async exportCampus(campusId: string): Promise<CampusBundle> {
    const user = await authGuard.enforce('export', 'campus', { campusId });
    const campusRes = await campusService.getCampusById(campusId);
    if (!campusRes.success || !campusRes.data) throw new Error('Campus not found.');

    const campus = campusRes.data;

    // Buildings
    const buildingsRes = await campusService.getBuildingsByCampus(campusId);
    const buildings = buildingsRes.data || [];

    // Floors – gather for all buildings
    const allFloors: any[] = [];
    for (const bld of buildings) {
      const fRes = await campusService.getFloorsByBuilding(bld.id);
      if (fRes.success && fRes.data) allFloors.push(...fRes.data);
    }

    // Object types (all shared types)
    const objectTypesRes = await objectTypeService.getAll();
    const objectTypes = objectTypesRes.data || [];

    // Objects
    const objects = objectStore.getByCampus(campusId, true);

    // Nodes & Connections from navStore
    const nodes = navStore.getNodesByCampus(campusId);
    const connections = navStore.getConnectionsByCampus(campusId);

    // Access Rules
    const accessRulesRes = await accessRuleService.getRulesByCampus(campusId);
    const accessRules = accessRulesRes.data || [];

    // Map-editor canvases live in browser storage because they can contain
    // large blueprint/image data. Include every campus, floor, and room
    // canvas so exporting a campus actually reproduces its declared maps.
    const mapLayouts: { storageKey: string; shapes: any[] }[] = [];
    if (typeof localStorage !== 'undefined') {
      const prefix = `editor-shapes-${campusId}`;
      for (let index = 0; index < localStorage.length; index++) {
        const storageKey = localStorage.key(index);
        if (!storageKey || !storageKey.startsWith(prefix)) continue;
        try {
          const shapes = JSON.parse(localStorage.getItem(storageKey) || '[]');
          if (Array.isArray(shapes)) mapLayouts.push({ storageKey, shapes });
        } catch {
          // A corrupt cache entry must not prevent export of the valid campus data.
        }
      }
    }

    const meta: CampusBundleMetadata = {
      schemaVersion: CAMPUS_BUNDLE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      description: `Campus export: ${typeof campus.name === 'string' ? campus.name : campus.name.en}`,
    };

    const bundle: CampusBundle = {
      _meta: meta,
      campus: {
        id: campus.id,
        organizationId: campus.organizationId,
        slug: campus.slug,
        code: campus.code,
        name: campus.name as Record<string, string>,
        description: campus.description as Record<string, string> | undefined,
        center: campus.center,
        metadata: campus.metadata,
        createdAt: campus.createdAt,
        updatedAt: campus.updatedAt,
      },
      buildings: buildings.map(b => ({
        id: b.id,
        campusId: b.campusId,
        code: b.code,
        name: b.name as Record<string, string>,
        description: b.description as Record<string, string> | undefined,
        totalFloors: b.totalFloors,
        entranceNodeIds: b.entranceNodeIds || [],
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
      floors: allFloors.map(f => ({
        id: f.id,
        buildingId: f.buildingId,
        campusId: f.campusId,
        level: f.level,
        code: f.code,
        name: f.name as Record<string, string>,
        dimensions: f.dimensions,
        planImageUrl: f.planImageUrl,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
      objectTypes: objectTypes.map(ot => ({
        id: ot.id,
        name: ot.name,
        category: ot.category,
        iconName: ot.iconName,
        color: ot.color,
        isWalkable: ot.isNavigable,
        propertyDefinitions: ot.propertyDefinitions,
        createdAt: ot.createdAt,
        updatedAt: ot.updatedAt,
      })),
      objects: objects.map(o => ({
        id: o.id,
        campusId: o.campusId,
        buildingId: o.buildingId,
        floorId: o.floorId,
        code: o.code,
        name: o.name as Record<string, string>,
        description: o.description as Record<string, string> | undefined,
        category: o.category,
        objectTypeId: o.objectTypeId,
        geometry: o.geometry,
        geometryType: o.geometryType as any,
        coordinates: o.coordinates,
        associatedNodeId: o.associatedNodeId,
        entranceNodeIds: o.entranceNodeIds,
        isAccessible: o.isAccessible,
        parentObjectId: o.parentObjectId,
        subZoneType: o.subZoneType,
        status: o.status,
        tags: o.tags,
        images: o.images,
        historicalInfo: o.historicalInfo as Record<string, string> | undefined,
        contactInfo: o.contactInfo,
        externalLinks: o.externalLinks,
        attributes: o.attributes,
        properties: o.properties,
        accessSchedule: o.accessSchedule,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
      nodes: nodes.map(n => ({
        id: n.id,
        campusId: n.campusId,
        buildingId: n.buildingId!,
        floorId: n.floorId!,
        type: n.type,
        coordinates: n.coordinates,
        isAccessible: n.isAccessible,
        label: n.label,
      })),
      connections: connections.map(c => ({
        id: c.id,
        campusId: c.campusId,
        sourceNodeId: c.sourceNodeId,
        targetNodeId: c.targetNodeId,
        sourceFloorId: c.sourceFloorId || '',
        targetFloorId: c.targetFloorId || '',
        sourceBuildingId: c.sourceBuildingId || '',
        targetBuildingId: c.targetBuildingId || '',
        connectionType: c.connectionType,
        name: c.name,
        description: c.description,
        distanceMeters: c.distanceMeters,
        weightMultiplier: c.weightMultiplier,
        isWalkable: c.isWalkable,
        isVehicleAccessible: c.isVehicleAccessible,
        isAccessible: c.isAccessible,
        isBidirectional: c.isBidirectional,
        availability: c.availability,
        isRestricted: c.isRestricted,
        requiredPermissions: c.requiredPermissions,
        metadata: { name: c.name, description: c.description },
      })),
      accessRules,
      mapLayouts,
    };

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'EXPORT',
      resourceType: 'campus',
      resourceId: campusId,
      campusId: campusId,
      status: 'SUCCESS',
    });

    return bundle;
  }

  /**
   * Trigger browser file download of the campus JSON.
   */
  public async downloadCampusJson(campusId: string): Promise<void> {
    const bundle = await this.exportCampus(campusId);
    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = typeof bundle.campus.name === 'string' ? bundle.campus.name : (bundle.campus.name.en ?? 'campus');
    a.href = url;
    a.download = `campus-export-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATION & PREVIEW
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Validate a CampusBundle JSON before import.
   * Checks schema version, geometry integrity, coordinates, and cross-references.
   */
  public validate(raw: unknown): ValidationResult {
    const issues: ValidationIssue[] = [];

    // 1. Basic shape
    if (!raw || typeof raw !== 'object') {
      return this.failResult([{ severity: 'error', code: 'INVALID_JSON', message: 'Input is not a valid JSON object.' }]);
    }
    const bundle = raw as Record<string, any>;

    // 2. Schema version check
    const meta = bundle['_meta'];
    if (!meta || typeof meta !== 'object') {
      issues.push({ severity: 'error', code: 'MISSING_META', message: 'Missing _meta block.', path: '_meta' });
    } else {
      const version = meta['schemaVersion'];
      if (typeof version !== 'number' || version < 1) {
        issues.push({ severity: 'error', code: 'INVALID_VERSION', message: `Invalid schemaVersion: "${version}".`, path: '_meta.schemaVersion' });
      } else if (version !== CAMPUS_BUNDLE_SCHEMA_VERSION) {
        issues.push({
          severity: 'error',
          code: 'UNSUPPORTED_SCHEMA_VERSION',
          message: `Unsupported schemaVersion: "${version}". Supported versions: [${CAMPUS_BUNDLE_SCHEMA_VERSION}].`,
          path: '_meta.schemaVersion',
        });
      }
    }

    // 3. Campus object
    const campus = bundle['campus'];
    if (!campus || typeof campus !== 'object') {
      issues.push({ severity: 'error', code: 'MISSING_CAMPUS', message: 'Missing "campus" object.', path: 'campus' });
    } else {
      if (!campus.id) issues.push({ severity: 'error', code: 'MISSING_ID', message: 'campus.id is required.', path: 'campus.id' });
      if (!campus.code) issues.push({ severity: 'error', code: 'MISSING_CODE', message: 'campus.code is required.', path: 'campus.code' });
      if (!campus.name) issues.push({ severity: 'error', code: 'MISSING_NAME', message: 'campus.name is required.', path: 'campus.name' });
    }

    // 4. Arrays check
    const arrayKeys = ['buildings', 'floors', 'objectTypes', 'objects', 'nodes', 'connections'];
    for (const key of arrayKeys) {
      if (!Array.isArray(bundle[key])) {
        issues.push({ severity: 'error', code: 'MISSING_ARRAY', message: `"${key}" must be an array.`, path: key });
      }
    }

    // Check entity IDs and cross references
    const idSet = new Set<string>();
    const addId = (id: string, path: string) => {
      if (idSet.has(id)) {
        issues.push({ severity: 'error', code: 'DUPLICATE_ID', message: `Duplicate entity ID "${id}".`, path });
      } else {
        idSet.add(id);
      }
    };

    // 5. Buildings
    const buildingIds = new Set<string>();
    if (Array.isArray(bundle['buildings'])) {
      for (const [i, b] of (bundle['buildings'] as any[]).entries()) {
        if (!b.id) { issues.push({ severity: 'error', code: 'MISSING_ID', message: `buildings[${i}] has no id.` }); continue; }
        addId(b.id, `buildings[${i}].id`);
        buildingIds.add(b.id);
      }
    }

    // 6. Floors
    const floorIds = new Set<string>();
    if (Array.isArray(bundle['floors'])) {
      for (const [i, f] of (bundle['floors'] as any[]).entries()) {
        if (!f.id) { issues.push({ severity: 'error', code: 'MISSING_ID', message: `floors[${i}] has no id.` }); continue; }
        addId(f.id, `floors[${i}].id`);
        floorIds.add(f.id);
        if (f.buildingId && !buildingIds.has(f.buildingId)) {
          issues.push({ severity: 'warning', code: 'ORPHAN_FLOOR', message: `floors[${i}] references non-existent building "${f.buildingId}".`, path: `floors[${i}].buildingId` });
        }
      }
    }

    // 7. Nodes
    const nodeIds = new Set<string>();
    if (Array.isArray(bundle['nodes'])) {
      for (const [i, n] of (bundle['nodes'] as any[]).entries()) {
        if (!n.id) { issues.push({ severity: 'error', code: 'MISSING_ID', message: `nodes[${i}] has no id.` }); continue; }
        addId(n.id, `nodes[${i}].id`);
        nodeIds.add(n.id);

        if (n.buildingId && !buildingIds.has(n.buildingId)) {
          issues.push({ severity: 'warning', code: 'INVALID_REF', message: `nodes[${i}].buildingId "${n.buildingId}" not found in buildings.`, path: `nodes[${i}].buildingId` });
        }
        if (n.floorId && !floorIds.has(n.floorId)) {
          issues.push({ severity: 'warning', code: 'INVALID_REF', message: `nodes[${i}].floorId "${n.floorId}" not found in floors.`, path: `nodes[${i}].floorId` });
        }

        if (n.coordinates) {
          try {
            securityValidation.validateCoordinates(n.coordinates);
          } catch (err: any) {
            issues.push({ severity: 'error', code: 'INVALID_COORDINATES', message: `nodes[${i}].coordinates: ${err.message}`, path: `nodes[${i}].coordinates` });
          }
        }
      }
    }

    // 8. Objects
    const objectIds = new Set<string>();
    if (Array.isArray(bundle['objects'])) {
      for (const [i, o] of (bundle['objects'] as any[]).entries()) {
        if (!o.id) { issues.push({ severity: 'error', code: 'MISSING_ID', message: `objects[${i}] has no id.` }); continue; }
        addId(o.id, `objects[${i}].id`);
        objectIds.add(o.id);

        if (o.buildingId && !buildingIds.has(o.buildingId)) {
          issues.push({ severity: 'error', code: 'INVALID_REF', message: `objects[${i}].buildingId "${o.buildingId}" not found in buildings.`, path: `objects[${i}].buildingId` });
        }
        if (o.floorId && !floorIds.has(o.floorId)) {
          issues.push({ severity: 'error', code: 'INVALID_REF', message: `objects[${i}].floorId "${o.floorId}" not found in floors.`, path: `objects[${i}].floorId` });
        }
        if (o.associatedNodeId && !nodeIds.has(o.associatedNodeId)) {
          issues.push({ severity: 'error', code: 'INVALID_REF', message: `objects[${i}].associatedNodeId "${o.associatedNodeId}" not found in nodes.`, path: `objects[${i}].associatedNodeId` });
        }
        if (Array.isArray(o.entranceNodeIds)) {
          for (const eid of o.entranceNodeIds) {
            if (!nodeIds.has(eid)) {
              issues.push({ severity: 'error', code: 'INVALID_REF', message: `objects[${i}].entranceNodeIds contains unknown node "${eid}".`, path: `objects[${i}].entranceNodeIds` });
            }
          }
        }

        // Coordinate validation
        if (o.coordinates) {
          try {
            securityValidation.validateCoordinates(o.coordinates);
          } catch (err: any) {
            issues.push({ severity: 'error', code: 'INVALID_COORDINATES', message: `objects[${i}].coordinates: ${err.message}`, path: `objects[${i}].coordinates` });
          }
        }

        // Geometry validation
        if (o.geometry) {
          try {
            securityValidation.validateGeoJson(o.geometry);
          } catch (err: any) {
            issues.push({ severity: 'error', code: 'MALFORMED_GEOMETRY', message: `objects[${i}].geometry: ${err.message}`, path: `objects[${i}].geometry` });
          }
        }
      }
    }

    // 9. Parent object self-references check
    if (Array.isArray(bundle['objects'])) {
      for (const [i, o] of (bundle['objects'] as any[]).entries()) {
        if (o.parentObjectId && !objectIds.has(o.parentObjectId)) {
          issues.push({ severity: 'warning', code: 'INVALID_REF', message: `objects[${i}].parentObjectId "${o.parentObjectId}" not found in objects array.`, path: `objects[${i}].parentObjectId` });
        }
      }
    }

    // 10. Connections
    if (Array.isArray(bundle['connections'])) {
      for (const [i, c] of (bundle['connections'] as any[]).entries()) {
        if (!c.id) { issues.push({ severity: 'error', code: 'MISSING_ID', message: `connections[${i}] has no id.` }); continue; }
        addId(c.id, `connections[${i}].id`);
        if (!nodeIds.has(c.sourceNodeId)) {
          issues.push({ severity: 'error', code: 'INVALID_REF', message: `connections[${i}].sourceNodeId "${c.sourceNodeId}" not in nodes.`, path: `connections[${i}].sourceNodeId` });
        }
        if (!nodeIds.has(c.targetNodeId)) {
          issues.push({ severity: 'error', code: 'INVALID_REF', message: `connections[${i}].targetNodeId "${c.targetNodeId}" not in nodes.`, path: `connections[${i}].targetNodeId` });
        }
      }
    }

    const valid = !issues.some(i => i.severity === 'error');
    return this.buildResult(valid, issues, bundle);
  }

  private failResult(issues: ValidationIssue[]): ValidationResult {
    return { valid: false, issues, stats: { buildings: 0, floors: 0, objects: 0, connections: 0, objectTypes: 0, nodes: 0 } };
  }

  private buildResult(valid: boolean, issues: ValidationIssue[], bundle: Record<string, any>): ValidationResult {
    return {
      valid,
      issues,
      stats: {
        buildings: Array.isArray(bundle['buildings']) ? bundle['buildings'].length : 0,
        floors: Array.isArray(bundle['floors']) ? bundle['floors'].length : 0,
        objects: Array.isArray(bundle['objects']) ? bundle['objects'].length : 0,
        connections: Array.isArray(bundle['connections']) ? bundle['connections'].length : 0,
        objectTypes: Array.isArray(bundle['objectTypes']) ? bundle['objectTypes'].length : 0,
        nodes: Array.isArray(bundle['nodes']) ? bundle['nodes'].length : 0,
      },
    };
  }

  /**
   * Parse a JSON string, validate it, and return the bundle.
   */
  public parseAndValidate(jsonText: string): { bundle: CampusBundle | null; validation: ValidationResult } {
    if (typeof jsonText === 'string' && jsonText.length > MAX_IMPORT_SIZE_BYTES) {
      return {
        bundle: null,
        validation: this.failResult([{
          severity: 'error',
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds maximum permitted import limit of ${(MAX_IMPORT_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB.`,
        }]),
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return {
        bundle: null,
        validation: this.failResult([{ severity: 'error', code: 'JSON_PARSE_ERROR', message: 'The file is not valid JSON.' }]),
      };
    }

    const validation = this.validate(parsed);
    return {
      bundle: validation.valid ? (parsed as CampusBundle) : null,
      validation,
    };
  }

  /**
   * Provides a preview and detailed validation diff before committing an import.
   */
  public async previewImport(
    rawInput: string | unknown,
    options: ImportCampusOptions = {}
  ): Promise<ImportPreviewResult> {
    let bundle: CampusBundle | null = null;
    let validation: ValidationResult;

    if (typeof rawInput === 'string') {
      const pv = this.parseAndValidate(rawInput);
      bundle = pv.bundle;
      validation = pv.validation;
    } else {
      validation = this.validate(rawInput);
      if (validation.valid) {
        bundle = rawInput as CampusBundle;
      }
    }

    if (!validation.valid || !bundle) {
      return {
        valid: false,
        issues: validation.issues,
        stats: validation.stats,
      };
    }

    const mode = options.importMode || 'create_new_site';
    const existingCampusesRes = await campusService.getCampuses();
    const existingCampuses = existingCampusesRes.data || [];
    const existingTypesRes = await objectTypeService.getAll();
    const existingTypes = existingTypesRes.data || [];
    const existingTypeSlugs = new Set(existingTypes.map(t => t.slug));

    const customObjectTypes = (bundle.objectTypes || [])
      .filter(ot => !existingTypeSlugs.has((ot as any).slug || ot.id))
      .map(ot => ot.name || ot.id);

    const potentialCollisions: string[] = [];

    if (mode === 'create_new_site') {
      const desiredSlug = options.newCampusSlug || bundle.campus.slug;
      if (existingCampuses.some(c => c.slug === desiredSlug)) {
        potentialCollisions.push(`A campus with slug "${desiredSlug}" already exists. Fresh unique slug will be assigned.`);
      }
    } else if (mode === 'merge_into_existing') {
      if (!options.targetCampusId) {
        validation.issues.push({
          severity: 'error',
          code: 'MISSING_TARGET_CAMPUS',
          message: 'A targetCampusId is required when importMode is "merge_into_existing".',
        });
        return { valid: false, issues: validation.issues, stats: validation.stats };
      }
      const target = existingCampuses.find(c => c.id === options.targetCampusId);
      if (!target) {
        validation.issues.push({
          severity: 'error',
          code: 'TARGET_CAMPUS_NOT_FOUND',
          message: `Target campus '${options.targetCampusId}' does not exist.`,
        });
        return { valid: false, issues: validation.issues, stats: validation.stats };
      }
    }

    const previewDiff: ImportPreviewDiff = {
      campus: {
        action: mode === 'merge_into_existing' ? 'merge_into_existing' : 'create_new_site',
        name: typeof bundle.campus.name === 'string' ? bundle.campus.name : (bundle.campus.name?.en || 'Imported Campus'),
        code: options.newCampusCode || bundle.campus.code,
        slug: options.newCampusSlug || bundle.campus.slug,
        targetCampusId: options.targetCampusId,
      },
      buildings: (bundle.buildings || []).map(b => ({
        code: b.code,
        name: typeof b.name === 'string' ? b.name : (b.name?.en || b.code),
        floorCount: (bundle.floors || []).filter(f => f.buildingId === b.id).length,
      })),
      floorsCount: bundle.floors?.length || 0,
      objectsCount: bundle.objects?.length || 0,
      nodesCount: bundle.nodes?.length || 0,
      connectionsCount: bundle.connections?.length || 0,
      accessRulesCount: bundle.accessRules?.length || 0,
      objectTypesCount: bundle.objectTypes?.length || 0,
      customObjectTypes,
      potentialCollisions,
    };

    return {
      valid: true,
      issues: validation.issues,
      preview: previewDiff,
      bundle,
      stats: validation.stats,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // IMPORT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Imports a CampusBundle into the system.
   *
   * In 'create_new_site' mode (default), re-keys all entity IDs to completely isolate
   * the imported site from any existing site.
   * In 'merge_into_existing' mode, maps incoming buildings, floors, objects, and connections
   * into an existing campus without overwriting existing entities.
   *
   * Wrapped in a transaction to guarantee atomic rollback if any error occurs.
   */
  public async importCampus(
    bundle: CampusBundle,
    options: ImportCampusOptions = {}
  ): Promise<ImportCampusResult> {
    // 1. Strict validation prior to mutation
    const validation = this.validate(bundle);
    if (!validation.valid) {
      const errorMsgs = validation.issues
        .filter(i => i.severity === 'error')
        .map(i => i.message)
        .join('; ');
      throw new ValidationError(`Import validation failed: ${errorMsgs}`);
    }

    const migrated = this.migrate(bundle);
    const mode = options.importMode || 'create_new_site';
    const targetOrgId = options.targetOrganizationId || migrated.campus.organizationId || 'org-omnicampus';

    const user = await authGuard.enforce('import', 'campus', { organizationId: targetOrgId });

    // 2. Execute import inside atomic transaction
    return await transactionService.run('import-campus', async () => {
      let targetCampusId: string;

      if (mode === 'merge_into_existing') {
        if (!options.targetCampusId) {
          throw new ValidationError('A targetCampusId is required when importMode is "merge_into_existing".');
        }
        const existingRes = await campusService.getCampusById(options.targetCampusId);
        if (!existingRes.success || !existingRes.data) {
          throw new ValidationError(`Target campus '${options.targetCampusId}' for merge not found.`);
        }
        targetCampusId = options.targetCampusId;
      } else {
        // Create new site mode
        targetCampusId = uuidv4();
        const targetSlug = options.newCampusSlug || `${migrated.campus.slug}-copy-${Date.now().toString().slice(-4)}`;
        const targetCode = options.newCampusCode || `${migrated.campus.code}-NEW`;
        const targetName = options.newCampusName || (
          typeof migrated.campus.name === 'string'
            ? { en: `${migrated.campus.name} (Imported)` }
            : { ...migrated.campus.name, en: `${migrated.campus.name?.en || 'Imported Campus'} (Imported)` }
        );

        await campusService.createCampus({
          id: targetCampusId,
          organizationId: targetOrgId,
          slug: targetSlug,
          code: targetCode,
          name: targetName,
          description: migrated.campus.description,
          center: migrated.campus.center,
          metadata: migrated.campus.metadata,
        });
      }

      // ID translation maps to avoid collision and preserve graph topology
      const buildingIdMap = new Map<string, string>();
      const floorIdMap = new Map<string, string>();
      const nodeIdMap = new Map<string, string>();
      const objectIdMap = new Map<string, string>();

      for (const b of migrated.buildings) {
        buildingIdMap.set(b.id, uuidv4());
      }
      for (const f of migrated.floors) {
        floorIdMap.set(f.id, uuidv4());
      }
      for (const n of migrated.nodes) {
        nodeIdMap.set(n.id, uuidv4());
      }
      for (const o of migrated.objects) {
        objectIdMap.set(o.id, uuidv4());
      }

      // 1. Create Buildings
      for (const b of migrated.buildings) {
        const newBldId = buildingIdMap.get(b.id)!;
        await campusService.createBuilding({
          id: newBldId,
          campusId: targetCampusId,
          code: b.code,
          name: b.name,
          description: b.description,
          totalFloors: b.totalFloors,
          entranceNodeIds: (b.entranceNodeIds || []).map(nid => nodeIdMap.get(nid) || nid),
        });
      }

      // 2. Create Floors
      for (const f of migrated.floors) {
        const newFlrId = floorIdMap.get(f.id)!;
        const mappedBldId = buildingIdMap.get(f.buildingId) || f.buildingId;
        await campusService.createFloor({
          id: newFlrId,
          campusId: targetCampusId,
          buildingId: mappedBldId,
          level: f.level,
          code: f.code,
          name: f.name,
          dimensions: f.dimensions,
          planImageUrl: (f as any).planImageUrl,
        });
      }

      // 3. Object Types
      const existingTypesRes = await objectTypeService.getAll();
      const existingTypeSlugs = new Set((existingTypesRes.data || []).map(t => t.slug));
      let objectTypesImported = 0;

      for (const ot of migrated.objectTypes) {
        const slug = (ot as any).slug || ot.id;
        if (!existingTypeSlugs.has(slug)) {
          try {
            await objectTypeService.create({
              slug,
              name: ot.name,
              description: (ot as any).description || '',
              category: ot.category as any,
              iconName: ot.iconName,
              color: ot.color,
              isNavigable: ot.isWalkable ?? true,
              isBarrier: false,
              isConnector: false,
              propertyDefinitions: ot.propertyDefinitions || [],
            });
            existingTypeSlugs.add(slug);
            objectTypesImported++;
          } catch {
            // system or existing type already present
          }
        }
      }

      // 4. Objects (preserving geometry, objectTypeId, parent zones, properties, schedules)
      for (const o of migrated.objects) {
        const newObjId = objectIdMap.get(o.id)!;
        const mappedBldId = buildingIdMap.get(o.buildingId) || o.buildingId;
        const mappedFlrId = floorIdMap.get(o.floorId) || o.floorId;
        const mappedParentId = o.parentObjectId ? (objectIdMap.get(o.parentObjectId) || o.parentObjectId) : undefined;
        const mappedAssocNode = o.associatedNodeId ? (nodeIdMap.get(o.associatedNodeId) || o.associatedNodeId) : '';
        const mappedEntranceNodes = (o.entranceNodeIds || []).map((id: string) => nodeIdMap.get(id) || id);

        objectStore.create({
          id: newObjId,
          campusId: targetCampusId,
          buildingId: mappedBldId,
          floorId: mappedFlrId,
          code: o.code,
          name: o.name,
          description: o.description,
          category: o.category,
          objectTypeId: o.objectTypeId,
          geometry: o.geometry,
          geometryType: o.geometryType as any,
          coordinates: o.coordinates,
          associatedNodeId: mappedAssocNode,
          entranceNodeIds: mappedEntranceNodes,
          isAccessible: o.isAccessible,
          parentObjectId: mappedParentId,
          subZoneType: o.subZoneType,
          status: (o.status as any) || 'active',
          tags: o.tags,
          images: o.images,
          historicalInfo: o.historicalInfo,
          contactInfo: o.contactInfo,
          externalLinks: o.externalLinks,
          attributes: o.attributes,
          properties: (o as any).properties,
          accessSchedule: (o as any).accessSchedule,
        });
      }

      // 5. Navigation Nodes
      for (const n of migrated.nodes) {
        const newNodeId = nodeIdMap.get(n.id)!;
        const mappedBldId = buildingIdMap.get(n.buildingId) || n.buildingId;
        const mappedFlrId = floorIdMap.get(n.floorId) || n.floorId;

        navStore.createNode({
          id: newNodeId,
          campusId: targetCampusId,
          buildingId: mappedBldId,
          floorId: mappedFlrId,
          type: n.type as any,
          coordinates: n.coordinates,
          isAccessible: n.isAccessible,
          label: n.label,
        });
      }

      // 6. Navigation Connections (preserving vertical transitions and connector metadata)
      for (const c of migrated.connections) {
        const mappedSourceNode = nodeIdMap.get(c.sourceNodeId) || c.sourceNodeId;
        const mappedTargetNode = nodeIdMap.get(c.targetNodeId) || c.targetNodeId;
        const mappedSourceBld = c.sourceBuildingId ? (buildingIdMap.get(c.sourceBuildingId) || c.sourceBuildingId) : undefined;
        const mappedTargetBld = c.targetBuildingId ? (buildingIdMap.get(c.targetBuildingId) || c.targetBuildingId) : undefined;
        const mappedSourceFlr = c.sourceFloorId ? (floorIdMap.get(c.sourceFloorId) || c.sourceFloorId) : undefined;
        const mappedTargetFlr = c.targetFloorId ? (floorIdMap.get(c.targetFloorId) || c.targetFloorId) : undefined;

        navStore.createConnection({
          id: uuidv4(),
          campusId: targetCampusId,
          sourceNodeId: mappedSourceNode,
          targetNodeId: mappedTargetNode,
          sourceBuildingId: mappedSourceBld,
          targetBuildingId: mappedTargetBld,
          sourceFloorId: mappedSourceFlr,
          targetFloorId: mappedTargetFlr,
          connectionType: c.connectionType as any,
          name: c.name || (c as any).metadata?.name || 'Imported Connection',
          description: c.description || (c as any).metadata?.description,
          distanceMeters: c.distanceMeters,
          weightMultiplier: c.weightMultiplier || 1.0,
          isWalkable: c.isWalkable ?? true,
          isVehicleAccessible: c.isVehicleAccessible ?? false,
          isAccessible: c.isAccessible ?? true,
          isBidirectional: c.isBidirectional ?? true,
          availability: c.availability,
          isRestricted: c.isRestricted ?? false,
          requiredPermissions: c.requiredPermissions,
        });
      }

      // 7. Access Rules
      let accessRulesImported = 0;
      if (Array.isArray(migrated.accessRules)) {
        for (const ar of migrated.accessRules) {
          let mappedTargetId = ar.targetId;
          if (ar.targetType === 'object') {
            mappedTargetId = objectIdMap.get(ar.targetId) || ar.targetId;
          } else if (ar.targetType === 'floor') {
            mappedTargetId = floorIdMap.get(ar.targetId) || ar.targetId;
          } else if (ar.targetType === 'building') {
            mappedTargetId = buildingIdMap.get(ar.targetId) || ar.targetId;
          }

          await accessRuleService.createRule({
            campusId: targetCampusId,
            targetType: ar.targetType,
            targetId: mappedTargetId,
            ruleType: ar.ruleType,
            name: ar.name,
            description: ar.description,
            validFrom: ar.validFrom,
            validUntil: ar.validUntil,
            activeDays: ar.activeDays,
            openTime: ar.openTime,
            closeTime: ar.closeTime,
            allowedRoles: ar.allowedRoles,
            isRoutingBlocked: ar.isRoutingBlocked,
            closureReason: ar.closureReason,
          });
          accessRulesImported++;
        }
      }

      // 8. Restore the actual map-editor canvases after their referenced
      // buildings, floors, rooms, and navigation nodes have been recreated.
      // IDs are re-keyed for isolated imports, so remap both the storage key
      // and every embedded shape reference before writing the layout.
      let mapLayoutsImported = 0;
      if (typeof localStorage !== 'undefined' && Array.isArray(migrated.mapLayouts)) {
        const layoutIdMap = new Map<string, string>([
          [migrated.campus.id, targetCampusId],
          ...Array.from(buildingIdMap.entries()),
          ...Array.from(floorIdMap.entries()),
          ...Array.from(objectIdMap.entries()),
          ...Array.from(nodeIdMap.entries()),
        ]);
        for (const layout of migrated.mapLayouts) {
          if (!layout || typeof layout.storageKey !== 'string' || !Array.isArray(layout.shapes)) continue;
          const storageKey = replaceMappedIds(layout.storageKey, layoutIdMap) as string;
          const shapes = replaceMappedIds(layout.shapes, layoutIdMap);
          localStorage.setItem(storageKey, JSON.stringify(shapes));
          mapLayoutsImported++;
        }
      }

      auditService.log({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'IMPORT',
        resourceType: 'campus',
        resourceId: targetCampusId,
        campusId: targetCampusId,
        organizationId: targetOrgId,
        status: 'SUCCESS',
        details: {
          importMode: mode,
          buildingsCount: migrated.buildings.length,
          floorsCount: migrated.floors.length,
          objectsCount: migrated.objects.length,
          nodesCount: migrated.nodes.length,
          connectionsCount: migrated.connections.length,
          mapLayoutsCount: mapLayoutsImported,
        },
      });

      return {
        success: true,
        campusId: targetCampusId,
        message: mode === 'merge_into_existing'
          ? `Successfully merged site records into campus '${targetCampusId}'.`
          : `Successfully imported site with isolated hierarchy.`,
        stats: {
          buildings: migrated.buildings.length,
          floors: migrated.floors.length,
          objectTypes: objectTypesImported,
          objects: migrated.objects.length,
          nodes: migrated.nodes.length,
          connections: migrated.connections.length,
          accessRules: accessRulesImported,
        },
      };
    });
  }

  /**
   * Apply a migration from an older schema version to the current one.
   */
  public migrate(bundle: CampusBundle): CampusBundle {
    const version = bundle._meta?.schemaVersion ?? 0;
    if (version === CAMPUS_BUNDLE_SCHEMA_VERSION) return bundle;
    console.warn(`Migrating bundle from v${version} to v${CAMPUS_BUNDLE_SCHEMA_VERSION}`);
    return { ...bundle, _meta: { ...bundle._meta, schemaVersion: CAMPUS_BUNDLE_SCHEMA_VERSION } };
  }
}

export const campusImportExportService = CampusImportExportService.getInstance();
