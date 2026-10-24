import {
  CampusBundle,
  CampusBundleMetadata,
  CAMPUS_BUNDLE_SCHEMA_VERSION,
  ValidationResult,
  ValidationIssue,
} from '../types/import-export';
import { campusService } from './campus.service';
import { objectService } from './object.service';
import { objectTypeService } from './object-type.service';
import { INITIAL_NODES } from './mock-data';

/**
 * CampusImportExportService
 *
 * Handles full campus export to JSON and import with schema validation.
 *
 * Safety rules:
 *  - NEVER exports credentials, auth tokens, or user passwords.
 *  - Export is fully self-contained and portable.
 *  - Import validates schema, detects duplicates, and verifies cross-references.
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
    const objectsRes = await objectService.getObjectsByCampus(campusId);
    const objects = objectsRes.data || [];

    // Nodes — filter by campusId
    const nodes = INITIAL_NODES.filter(n => n.campusId === campusId);

    // Connections — mock; in a real app would be from a connection service
    const connections: any[] = []; // TODO: wire in connectionService when available

    const meta: CampusBundleMetadata = {
      schemaVersion: CAMPUS_BUNDLE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      description: `Campus export: ${typeof campus.name === 'string' ? campus.name : campus.name.en}`,
    };

    const bundle: CampusBundle = {
      _meta: meta,
      campus: {
        id: campus.id,
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
        coordinates: o.coordinates,
        associatedNodeId: o.associatedNodeId,
        isAccessible: o.isAccessible,
        tags: o.tags,
        images: o.images,
        historicalInfo: o.historicalInfo as Record<string, string> | undefined,
        contactInfo: o.contactInfo,
        externalLinks: o.externalLinks,
        attributes: o.attributes,
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
      connections,
    };

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
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Validate a CampusBundle JSON before import.
   * Returns a structured ValidationResult with all issues.
   */
  public validate(raw: unknown): ValidationResult {
    const issues: ValidationIssue[] = [];

    // 1. Basic shape
    if (!raw || typeof raw !== 'object') {
      return this.failResult([{ severity: 'error', code: 'INVALID_JSON', message: 'Input is not a valid JSON object.' }]);
    }
    const bundle = raw as Record<string, any>;

    // 2. Schema version
    const meta = bundle['_meta'];
    if (!meta || typeof meta !== 'object') {
      issues.push({ severity: 'error', code: 'MISSING_META', message: 'Missing _meta block.', path: '_meta' });
    } else {
      const version = meta['schemaVersion'];
      if (typeof version !== 'number') {
        issues.push({ severity: 'error', code: 'MISSING_VERSION', message: 'Missing schemaVersion in _meta.', path: '_meta.schemaVersion' });
      } else if (version > CAMPUS_BUNDLE_SCHEMA_VERSION) {
        issues.push({ severity: 'error', code: 'VERSION_TOO_NEW', message: `Bundle version ${version} is newer than supported version ${CAMPUS_BUNDLE_SCHEMA_VERSION}. Upgrade the platform.`, path: '_meta.schemaVersion' });
      } else if (version < CAMPUS_BUNDLE_SCHEMA_VERSION) {
        issues.push({ severity: 'warning', code: 'VERSION_OLD', message: `Bundle version ${version} is older than current (${CAMPUS_BUNDLE_SCHEMA_VERSION}). Migration will be applied.`, path: '_meta.schemaVersion' });
      }
    }

    // 3. Required top-level sections
    const required = ['campus', 'buildings', 'floors', 'objects', 'nodes', 'connections', 'objectTypes'];
    for (const key of required) {
      if (!(key in bundle)) {
        issues.push({ severity: 'error', code: 'MISSING_SECTION', message: `Required section "${key}" is missing.`, path: key });
      }
    }
    if (issues.some(i => i.severity === 'error')) {
      return this.buildResult(false, issues, bundle);
    }

    // 4. Campus fields
    const campus = bundle['campus'];
    for (const field of ['id', 'slug', 'code', 'name']) {
      if (!campus[field]) issues.push({ severity: 'error', code: 'MISSING_CAMPUS_FIELD', message: `campus.${field} is required.`, path: `campus.${field}` });
    }

    // 5. Collect all declared IDs to detect duplicates and validate refs
    const allIds = new Set<string>();
    const campusId = campus?.id;

    const addId = (id: string, path: string) => {
      if (allIds.has(id)) {
        issues.push({ severity: 'error', code: 'DUPLICATE_ID', message: `Duplicate ID "${id}".`, path });
      }
      allIds.add(id);
    };

    if (campusId) addId(campusId, 'campus.id');

    // 6. Buildings
    const buildingIds = new Set<string>();
    for (const [i, b] of (bundle['buildings'] as any[]).entries()) {
      if (!b.id) { issues.push({ severity: 'error', code: 'MISSING_ID', message: `buildings[${i}] has no id.`, path: `buildings[${i}]` }); continue; }
      addId(b.id, `buildings[${i}].id`);
      buildingIds.add(b.id);
      if (b.campusId !== campusId) issues.push({ severity: 'error', code: 'CAMPUS_MISMATCH', message: `buildings[${i}].campusId does not match campus.id.`, path: `buildings[${i}].campusId` });
    }

    // 7. Floors
    const floorIds = new Set<string>();
    for (const [i, f] of (bundle['floors'] as any[]).entries()) {
      if (!f.id) { issues.push({ severity: 'error', code: 'MISSING_ID', message: `floors[${i}] has no id.` }); continue; }
      addId(f.id, `floors[${i}].id`);
      floorIds.add(f.id);
      if (f.campusId !== campusId) issues.push({ severity: 'error', code: 'CAMPUS_MISMATCH', message: `floors[${i}].campusId does not match campus.id.`, path: `floors[${i}].campusId` });
      if (!buildingIds.has(f.buildingId)) issues.push({ severity: 'error', code: 'INVALID_REF', message: `floors[${i}].buildingId "${f.buildingId}" not found in buildings.`, path: `floors[${i}].buildingId` });
    }

    // 8. Objects
    const objectIds = new Set<string>();
    for (const [i, o] of (bundle['objects'] as any[]).entries()) {
      if (!o.id) { issues.push({ severity: 'error', code: 'MISSING_ID', message: `objects[${i}] has no id.` }); continue; }
      addId(o.id, `objects[${i}].id`);
      objectIds.add(o.id);
      if (o.campusId !== campusId) issues.push({ severity: 'error', code: 'CAMPUS_MISMATCH', message: `objects[${i}].campusId mismatch.`, path: `objects[${i}].campusId` });
      if (!buildingIds.has(o.buildingId)) issues.push({ severity: 'warning', code: 'INVALID_REF', message: `objects[${i}].buildingId "${o.buildingId}" not found.`, path: `objects[${i}].buildingId` });
      if (!floorIds.has(o.floorId)) issues.push({ severity: 'warning', code: 'INVALID_REF', message: `objects[${i}].floorId "${o.floorId}" not found.`, path: `objects[${i}].floorId` });
      if (!o.coordinates || typeof o.coordinates.x !== 'number' || typeof o.coordinates.y !== 'number') {
        issues.push({ severity: 'error', code: 'INVALID_GEOMETRY', message: `objects[${i}].coordinates is invalid.`, path: `objects[${i}].coordinates` });
      }
    }

    // 9. Nodes
    const nodeIds = new Set<string>();
    for (const [i, n] of (bundle['nodes'] as any[]).entries()) {
      if (!n.id) { issues.push({ severity: 'error', code: 'MISSING_ID', message: `nodes[${i}] has no id.` }); continue; }
      addId(n.id, `nodes[${i}].id`);
      nodeIds.add(n.id);
    }

    // 10. Connections — validate node refs
    for (const [i, c] of (bundle['connections'] as any[]).entries()) {
      if (!c.id) { issues.push({ severity: 'error', code: 'MISSING_ID', message: `connections[${i}] has no id.` }); continue; }
      addId(c.id, `connections[${i}].id`);
      if (!nodeIds.has(c.sourceNodeId)) issues.push({ severity: 'error', code: 'INVALID_REF', message: `connections[${i}].sourceNodeId "${c.sourceNodeId}" not in nodes.`, path: `connections[${i}].sourceNodeId` });
      if (!nodeIds.has(c.targetNodeId)) issues.push({ severity: 'error', code: 'INVALID_REF', message: `connections[${i}].targetNodeId "${c.targetNodeId}" not in nodes.`, path: `connections[${i}].targetNodeId` });
      if (typeof c.distanceMeters !== 'number' || c.distanceMeters < 0) {
        issues.push({ severity: 'warning', code: 'INVALID_DISTANCE', message: `connections[${i}].distanceMeters is invalid.`, path: `connections[${i}].distanceMeters` });
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

  // ─────────────────────────────────────────────────────────────────────────────
  // IMPORT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Parse a JSON string, validate it, and return the bundle.
   * Throws if the JSON is invalid. Returns ValidationResult alongside.
   */
  public parseAndValidate(jsonText: string): { bundle: CampusBundle | null; validation: ValidationResult } {
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
   * Apply a migration from an older schema version to the current one.
   * Currently a no-op for v1; add migration logic here for v2, v3 etc.
   */
  public migrate(bundle: CampusBundle): CampusBundle {
    const version = bundle._meta?.schemaVersion ?? 0;
    if (version === CAMPUS_BUNDLE_SCHEMA_VERSION) return bundle;
    // Future: if (version === 0) { /* apply migration */ }
    console.warn(`Migrating bundle from v${version} to v${CAMPUS_BUNDLE_SCHEMA_VERSION}`);
    return { ...bundle, _meta: { ...bundle._meta, schemaVersion: CAMPUS_BUNDLE_SCHEMA_VERSION } };
  }
}

export const campusImportExportService = CampusImportExportService.getInstance();
