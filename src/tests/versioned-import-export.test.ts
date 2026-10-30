/**
 * Versioned Map Import/Export System Tests
 *
 * Covers:
 *  - Full site export (buildings, floors, objects, geometry, nodes, connections, access rules)
 *  - Schema version validation & useful error messages
 *  - File size & malformed geometry rejection
 *  - Pre-import preview & validation diff
 *  - Safe ID remapping preventing collisions
 *  - Preservation of geometry, object types, multilingual metadata, floor & connector relationships
 *  - Options for 'create_new_site' and 'merge_into_existing'
 *  - Reusable indoor object type templates
 *  - Atomic rollback on failed import (zero orphaned/phantom records)
 *  - Round-trip routing preservation (identical path, distance, and transitions in imported site)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { campusImportExportService } from '../api/import-export.service';
import { campusService } from '../api/campus.service';
import { objectStore } from '../api/object.store';
import { navStore } from '../api/nav.store';
import { routingService } from '../api/routing.service';
import { templatesService } from '../api/templates.service';
import { authService } from '../api/auth.service';
import { ValidationError } from '../utils/errors';
import { CAMPUS_BUNDLE_SCHEMA_VERSION } from '../types/import-export';

describe('Versioned Map Import/Export System', () => {
  beforeEach(async () => {
    // Reset stores and ensure authenticated as super_admin
    await authService.loginAsDemoAdmin('super_admin');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Export Complete Site Configuration
  // ─────────────────────────────────────────────────────────────────────────
  it('exports a complete site configuration including geometry, nodes, connectors, and access rules', async () => {
    // Setup a source campus with multi-floor topology & geometry
    const campusRes = await campusService.createCampus({
      slug: 'export-source-site',
      code: 'SRC-EXP',
      name: { en: 'Source Science Center', es: 'Centro de Ciencias' },
      description: { en: 'A comprehensive multi-disciplinary site.' },
    });
    const campus = campusRes.data!;

    const bldRes = await campusService.createBuilding({
      campusId: campus.id,
      code: 'BLD-A',
      name: { en: 'Block Alpha' },
      totalFloors: 2,
    });
    const bld = bldRes.data!;

    const flr0Res = await campusService.createFloor({
      campusId: campus.id,
      buildingId: bld.id,
      level: 0,
      code: 'F0',
      name: { en: 'Ground Level' },
      dimensions: { widthMeters: 50, heightMeters: 40 },
    });
    const flr0 = flr0Res.data!;

    const flr1Res = await campusService.createFloor({
      campusId: campus.id,
      buildingId: bld.id,
      level: 1,
      code: 'F1',
      name: { en: 'First Level' },
      dimensions: { widthMeters: 50, heightMeters: 40 },
    });
    const flr1 = flr1Res.data!;

    // Ground floor node
    const node0 = navStore.createNode({
      campusId: campus.id,
      buildingId: bld.id,
      floorId: flr0.id,
      type: 'door',
      coordinates: { x: 10, y: 10 },
      label: 'Ground Entrance',
      isAccessible: true,
    });

    // First floor node
    const node1 = navStore.createNode({
      campusId: campus.id,
      buildingId: bld.id,
      floorId: flr1.id,
      type: 'door',
      coordinates: { x: 10, y: 10 },
      label: 'Lab Entrance',
      isAccessible: true,
    });

    // Vertical elevator connector between Floor 0 and Floor 1
    navStore.createConnection({
      campusId: campus.id,
      sourceBuildingId: bld.id,
      sourceFloorId: flr0.id,
      sourceNodeId: node0.id,
      targetBuildingId: bld.id,
      targetFloorId: flr1.id,
      targetNodeId: node1.id,
      connectionType: 'elevator',
      name: 'Main Elevator Shaft',
      distanceMeters: 4.5,
      weightMultiplier: 1.2,
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
    });

    // Room with GeoJSON Polygon geometry & multilingual metadata
    const room = objectStore.create({
      campusId: campus.id,
      buildingId: bld.id,
      floorId: flr1.id,
      code: 'LAB-101',
      name: { en: 'Quantum Physics Lab', de: 'Quantenphysik-Labor' },
      description: { en: 'Advanced laser research.' },
      category: 'room',
      objectTypeId: 'ot-lab',
      coordinates: { x: 10, y: 10 },
      associatedNodeId: node1.id,
      entranceNodeIds: [node1.id],
      isAccessible: true,
      geometryType: 'polygon',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]],
        ],
      },
      properties: { capacity: 25 },
    });

    // Perform Export
    const bundle = await campusImportExportService.exportCampus(campus.id);

    expect(bundle._meta.schemaVersion).toBe(CAMPUS_BUNDLE_SCHEMA_VERSION);
    expect(bundle.campus.id).toBe(campus.id);
    expect(bundle.campus.name.en).toBe('Source Science Center');
    expect(bundle.buildings.length).toBe(1);
    expect(bundle.floors.length).toBe(2);
    expect(bundle.nodes.length).toBe(2);
    expect(bundle.connections.length).toBe(1);
    expect(bundle.objects.length).toBeGreaterThanOrEqual(1);

    // Verify object geometry & multilingual metadata in export
    const exportedRoom = bundle.objects.find(o => o.id === room.id);
    expect(exportedRoom).toBeDefined();
    expect(exportedRoom?.geometry?.type).toBe('Polygon');
    expect(exportedRoom?.name.de).toBe('Quantenphysik-Labor');
    expect(exportedRoom?.objectTypeId).toBe('ot-lab');

    // Verify connector
    const exportedConn = bundle.connections[0];
    expect(exportedConn.connectionType).toBe('elevator');
    expect(exportedConn.sourceFloorId).toBe(flr0.id);
    expect(exportedConn.targetFloorId).toBe(flr1.id);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Schema-Version Validation & Error Messages
  // ─────────────────────────────────────────────────────────────────────────
  it('rejects unsupported schema versions with a clear error message', () => {
    const invalidBundle: any = {
      _meta: { schemaVersion: 99, exportedAt: new Date().toISOString() },
      campus: { id: 'c-1', code: 'C1', name: { en: 'Future Campus' } },
      buildings: [],
      floors: [],
      objectTypes: [],
      objects: [],
      nodes: [],
      connections: [],
    };

    const res = campusImportExportService.validate(invalidBundle);
    expect(res.valid).toBe(false);
    const versionIssue = res.issues.find(i => i.code === 'UNSUPPORTED_SCHEMA_VERSION');
    expect(versionIssue).toBeDefined();
    expect(versionIssue?.message).toContain('Unsupported schemaVersion: "99"');
  });

  it('rejects an import with missing _meta block', () => {
    const invalidBundle: any = {
      campus: { id: 'c-1', code: 'C1', name: { en: 'No Meta Campus' } },
      buildings: [],
      floors: [],
      objectTypes: [],
      objects: [],
      nodes: [],
      connections: [],
    };

    const res = campusImportExportService.validate(invalidBundle);
    expect(res.valid).toBe(false);
    expect(res.issues.some(i => i.code === 'MISSING_META')).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Rejection of Malformed Geometry, Coordinates, & References
  // ─────────────────────────────────────────────────────────────────────────
  it('rejects malformed GeoJSON geometry (unclosed Polygon ring)', () => {
    const malformedBundle: any = {
      _meta: { schemaVersion: CAMPUS_BUNDLE_SCHEMA_VERSION, exportedAt: new Date().toISOString() },
      campus: { id: 'c-1', code: 'C1', name: { en: 'Geo Test' } },
      buildings: [{ id: 'b-1', campusId: 'c-1', code: 'B1', name: { en: 'Bld' } }],
      floors: [{ id: 'f-1', buildingId: 'b-1', campusId: 'c-1', level: 0, code: 'F0', name: { en: 'F0' } }],
      nodes: [{ id: 'n-1', campusId: 'c-1', buildingId: 'b-1', floorId: 'f-1', coordinates: { x: 5, y: 5 } }],
      objectTypes: [],
      objects: [
        {
          id: 'o-1',
          campusId: 'c-1',
          buildingId: 'b-1',
          floorId: 'f-1',
          code: 'RM-1',
          name: { en: 'Broken Polygon' },
          coordinates: { x: 5, y: 5 },
          associatedNodeId: 'n-1',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [[0, 0], [10, 0], [10, 10], [0, 10]], // Unclosed ring! First != Last
            ],
          },
        },
      ],
      connections: [],
    };

    const res = campusImportExportService.validate(malformedBundle);
    expect(res.valid).toBe(false);
    const geoIssue = res.issues.find(i => i.code === 'MALFORMED_GEOMETRY');
    expect(geoIssue).toBeDefined();
    expect(geoIssue?.message).toContain('Polygon linear ring must be closed');
  });

  it('rejects invalid or negative coordinates', () => {
    const invalidCoordsBundle: any = {
      _meta: { schemaVersion: CAMPUS_BUNDLE_SCHEMA_VERSION, exportedAt: new Date().toISOString() },
      campus: { id: 'c-1', code: 'C1', name: { en: 'Coord Test' } },
      buildings: [{ id: 'b-1', campusId: 'c-1', code: 'B1', name: { en: 'Bld' } }],
      floors: [{ id: 'f-1', buildingId: 'b-1', campusId: 'c-1', level: 0, code: 'F0', name: { en: 'F0' } }],
      nodes: [{ id: 'n-1', campusId: 'c-1', buildingId: 'b-1', floorId: 'f-1', coordinates: { x: -100, y: 5 } }], // negative x
      objectTypes: [],
      objects: [],
      connections: [],
    };

    const res = campusImportExportService.validate(invalidCoordsBundle);
    expect(res.valid).toBe(false);
    expect(res.issues.some(i => i.code === 'INVALID_COORDINATES')).toBe(true);
  });

  it('rejects dangling foreign-key references in connection endpoints', () => {
    const danglingRefBundle: any = {
      _meta: { schemaVersion: CAMPUS_BUNDLE_SCHEMA_VERSION, exportedAt: new Date().toISOString() },
      campus: { id: 'c-1', code: 'C1', name: { en: 'Ref Test' } },
      buildings: [{ id: 'b-1', campusId: 'c-1', code: 'B1', name: { en: 'Bld' } }],
      floors: [{ id: 'f-1', buildingId: 'b-1', campusId: 'c-1', level: 0, code: 'F0', name: { en: 'F0' } }],
      nodes: [{ id: 'n-1', campusId: 'c-1', buildingId: 'b-1', floorId: 'f-1', coordinates: { x: 5, y: 5 } }],
      objectTypes: [],
      objects: [],
      connections: [
        {
          id: 'c-conn-1',
          campusId: 'c-1',
          sourceNodeId: 'n-1',
          targetNodeId: 'n-missing-ghost', // Dangling node ref
          connectionType: 'corridor',
          distanceMeters: 10,
        },
      ],
    };

    const res = campusImportExportService.validate(danglingRefBundle);
    expect(res.valid).toBe(false);
    expect(res.issues.some(i => i.code === 'INVALID_REF' && i.message.includes('n-missing-ghost'))).toBe(true);
  });

  it('rejects unsafe oversized import payloads (>20MB)', () => {
    // Generate an oversized string representation
    const hugeString = 'x'.repeat(21 * 1024 * 1024);
    const parseRes = campusImportExportService.parseAndValidate(hugeString);
    expect(parseRes.bundle).toBeNull();
    expect(parseRes.validation.valid).toBe(false);
    expect(parseRes.validation.issues.some(i => i.code === 'FILE_TOO_LARGE')).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Preview and Validation Before Committing Import
  // ─────────────────────────────────────────────────────────────────────────
  it('provides a detailed preview diff and counts before committing', async () => {
    const previewBundle: any = {
      _meta: { schemaVersion: CAMPUS_BUNDLE_SCHEMA_VERSION, exportedAt: new Date().toISOString() },
      campus: { id: 'c-p1', slug: 'preview-site', code: 'PV-01', name: { en: 'Preview Tech Park' } },
      buildings: [
        { id: 'b-p1', campusId: 'c-p1', code: 'B1', name: { en: 'Building 1' }, totalFloors: 1 },
      ],
      floors: [
        { id: 'f-p1', buildingId: 'b-p1', campusId: 'c-p1', level: 0, code: 'FL0', name: { en: 'Ground' } },
      ],
      nodes: [
        { id: 'n-p1', campusId: 'c-p1', buildingId: 'b-p1', floorId: 'f-p1', coordinates: { x: 5, y: 5 }, type: 'door' },
      ],
      objectTypes: [
        { id: 'ot-custom-kiosk', name: 'Interactive Kiosk', category: 'amenity', iconName: 'Monitor', color: '#ff00ff', isWalkable: true },
      ],
      objects: [
        {
          id: 'o-p1',
          campusId: 'c-p1',
          buildingId: 'b-p1',
          floorId: 'f-p1',
          code: 'KSK-01',
          name: { en: 'Wayfinding Kiosk' },
          coordinates: { x: 5, y: 5 },
          associatedNodeId: 'n-p1',
          category: 'amenity',
        },
      ],
      connections: [],
    };

    const preview = await campusImportExportService.previewImport(previewBundle, {
      importMode: 'create_new_site',
    });

    expect(preview.valid).toBe(true);
    expect(preview.preview).toBeDefined();
    expect(preview.preview?.campus.name).toBe('Preview Tech Park');
    expect(preview.preview?.buildings.length).toBe(1);
    expect(preview.preview?.floorsCount).toBe(1);
    expect(preview.preview?.objectsCount).toBe(1);
    expect(preview.preview?.nodesCount).toBe(1);
    expect(preview.preview?.customObjectTypes).toContain('Interactive Kiosk');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Failed Import Leaves Database 100% Unchanged (Atomic Rollback)
  // ─────────────────────────────────────────────────────────────────────────
  it('leaves the database completely unchanged when an import fails validation or transaction', async () => {
    const campusCountBefore = (await campusService.getCampuses()).data.length;
    const objectCountBefore = objectStore.getAll(true).length;

    // Bundle with an error that will cause rejection
    const badBundle: any = {
      _meta: { schemaVersion: CAMPUS_BUNDLE_SCHEMA_VERSION, exportedAt: new Date().toISOString() },
      campus: { id: 'c-fail', code: 'FAIL', name: { en: 'Will Fail' } },
      buildings: [],
      floors: [],
      nodes: [],
      objectTypes: [],
      objects: [
        {
          id: 'o-bad',
          campusId: 'c-fail',
          buildingId: 'b-missing', // INVALID REF!
          floorId: 'f-missing',
          code: 'BAD',
          name: { en: 'Bad' },
          coordinates: { x: 0, y: 0 },
          associatedNodeId: 'n-missing',
        },
      ],
      connections: [],
    };

    await expect(
      campusImportExportService.importCampus(badBundle)
    ).rejects.toThrow(ValidationError);

    // Verify database state is identical to before the call
    const campusCountAfter = (await campusService.getCampuses()).data.length;
    const objectCountAfter = objectStore.getAll(true).length;

    expect(campusCountAfter).toBe(campusCountBefore);
    expect(objectCountAfter).toBe(objectCountBefore);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Merge Into Existing Site Option
  // ─────────────────────────────────────────────────────────────────────────
  it('supports merging an imported bundle into an existing site without ID collisions', async () => {
    // 1. Create an existing target site
    const targetCampus = (await campusService.createCampus({
      slug: 'merge-target-site',
      code: 'MTS',
      name: { en: 'Main Corporate Campus' },
    })).data!;

    await campusService.createBuilding({
      campusId: targetCampus.id,
      code: 'EXISTING-BLD',
      name: { en: 'Existing Headquarters' },
      totalFloors: 1,
    });

    // 2. Prepare an incoming bundle representing an expansion wing
    const expansionBundle: any = {
      _meta: { schemaVersion: CAMPUS_BUNDLE_SCHEMA_VERSION, exportedAt: new Date().toISOString() },
      campus: { id: 'c-exp', code: 'EXP', name: { en: 'Expansion Wing' } },
      buildings: [
        { id: 'b-exp', campusId: 'c-exp', code: 'NEW-WING', name: { en: 'Research Wing' }, totalFloors: 1 },
      ],
      floors: [
        { id: 'f-exp', buildingId: 'b-exp', campusId: 'c-exp', level: 0, code: 'W0', name: { en: 'Wing Level 0' } },
      ],
      nodes: [
        { id: 'n-exp', campusId: 'c-exp', buildingId: 'b-exp', floorId: 'f-exp', type: 'door', coordinates: { x: 12, y: 12 } },
      ],
      objectTypes: [],
      objects: [
        {
          id: 'o-exp',
          campusId: 'c-exp',
          buildingId: 'b-exp',
          floorId: 'f-exp',
          code: 'CONF-WING',
          name: { en: 'Expansion Boardroom' },
          coordinates: { x: 12, y: 12 },
          associatedNodeId: 'n-exp',
        },
      ],
      connections: [],
    };

    // 3. Merge into target campus
    const mergeResult = await campusImportExportService.importCampus(expansionBundle, {
      importMode: 'merge_into_existing',
      targetCampusId: targetCampus.id,
    });

    expect(mergeResult.success).toBe(true);
    expect(mergeResult.campusId).toBe(targetCampus.id);

    // 4. Verify target campus now contains BOTH original and merged entities
    const buildings = (await campusService.getBuildingsByCampus(targetCampus.id)).data;
    expect(buildings.length).toBe(2);
    expect(buildings.some(b => b.code === 'EXISTING-BLD')).toBe(true);
    expect(buildings.some(b => b.code === 'NEW-WING')).toBe(true);

    const objects = objectStore.getByCampus(targetCampus.id);
    expect(objects.some(o => o.code === 'CONF-WING')).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Reusable Templates for Common Indoor Object Types
  // ─────────────────────────────────────────────────────────────────────────
  it('provides reusable indoor domain templates without hardcoding any specific organization', async () => {
    const templates = templatesService.getAvailableTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(4);

    const academic = templates.find(t => t.id === 'template-academic');
    const corporate = templates.find(t => t.id === 'template-corporate');
    const healthcare = templates.find(t => t.id === 'template-healthcare');
    const transit = templates.find(t => t.id === 'template-transit');

    expect(academic).toBeDefined();
    expect(corporate).toBeDefined();
    expect(healthcare).toBeDefined();
    expect(transit).toBeDefined();

    // Apply corporate template to active system
    const applied = await templatesService.applyTemplate('template-corporate');
    expect(applied.applied + applied.skipped).toBeGreaterThan(0);

    // Create a starter site from an academic template
    const starter = await templatesService.createStarterSite('template-academic', {
      name: 'Independent University Center',
      code: 'IUC',
      slug: 'independent-uni-center',
    });

    expect(starter.campus.id).toBeDefined();
    expect(starter.buildingId).toBeDefined();
    expect(starter.floorId).toBeDefined();

    const starterFloors = (await campusService.getFloorsByBuilding(starter.buildingId)).data;
    expect(starterFloors.length).toBe(1);
    expect(starterFloors[0].code).toBe('L0');
  }, 20000);

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Round-Trip Export/Import & Routing Preservation
  // ─────────────────────────────────────────────────────────────────────────
  it('preserves full spatial topology, geometry, and deterministic routing behavior across a complete round-trip', async () => {
    // 1. Construct a multi-floor connected site
    const srcCampus = (await campusService.createCampus({
      slug: 'round-trip-site',
      code: 'RTS',
      name: { en: 'Round Trip Academy', fr: 'Académie Aller-Retour' },
    })).data!;

    const srcBld = (await campusService.createBuilding({
      campusId: srcCampus.id,
      code: 'ENG-BLOCK',
      name: { en: 'Engineering Block' },
      totalFloors: 2,
    })).data!;

    const srcF0 = (await campusService.createFloor({
      campusId: srcCampus.id,
      buildingId: srcBld.id,
      level: 0,
      code: 'L0',
      name: { en: 'Ground Floor' },
      dimensions: { widthMeters: 100, heightMeters: 60 },
    })).data!;

    const srcF1 = (await campusService.createFloor({
      campusId: srcCampus.id,
      buildingId: srcBld.id,
      level: 1,
      code: 'L1',
      name: { en: 'Upper Floor' },
      dimensions: { widthMeters: 100, heightMeters: 60 },
    })).data!;

    // Create nodes: Start Room (Floor 0) -> Elevator 0 -> Elevator 1 -> Destination Room (Floor 1)
    const nStart = navStore.createNode({
      campusId: srcCampus.id,
      buildingId: srcBld.id,
      floorId: srcF0.id,
      type: 'door',
      coordinates: { x: 10, y: 10 },
      label: 'Reception Door',
      isAccessible: true,
    });

    const nElev0 = navStore.createNode({
      campusId: srcCampus.id,
      buildingId: srcBld.id,
      floorId: srcF0.id,
      type: 'elevator',
      coordinates: { x: 30, y: 10 },
      label: 'Elevator Shaft L0',
      isAccessible: true,
    });

    const nElev1 = navStore.createNode({
      campusId: srcCampus.id,
      buildingId: srcBld.id,
      floorId: srcF1.id,
      type: 'elevator',
      coordinates: { x: 30, y: 10 },
      label: 'Elevator Shaft L1',
      isAccessible: true,
    });

    const nEnd = navStore.createNode({
      campusId: srcCampus.id,
      buildingId: srcBld.id,
      floorId: srcF1.id,
      type: 'door',
      coordinates: { x: 60, y: 10 },
      label: 'Robotics Lab Door',
      isAccessible: true,
    });

    // Connections:
    // Floor 0 corridor: nStart <-> nElev0 (distance: 20m)
    navStore.createConnection({
      campusId: srcCampus.id,
      sourceBuildingId: srcBld.id,
      sourceFloorId: srcF0.id,
      sourceNodeId: nStart.id,
      targetBuildingId: srcBld.id,
      targetFloorId: srcF0.id,
      targetNodeId: nElev0.id,
      connectionType: 'corridor',
      name: 'Ground Corridor',
      distanceMeters: 20,
      weightMultiplier: 1.0,
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
    });

    // Vertical elevator transition: nElev0 <-> nElev1 (distance: 4m, elevator transition)
    navStore.createConnection({
      campusId: srcCampus.id,
      sourceBuildingId: srcBld.id,
      sourceFloorId: srcF0.id,
      sourceNodeId: nElev0.id,
      targetBuildingId: srcBld.id,
      targetFloorId: srcF1.id,
      targetNodeId: nElev1.id,
      connectionType: 'elevator',
      name: 'Vertical Lift',
      distanceMeters: 4,
      weightMultiplier: 1.2,
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
    });

    // Floor 1 corridor: nElev1 <-> nEnd (distance: 30m)
    navStore.createConnection({
      campusId: srcCampus.id,
      sourceBuildingId: srcBld.id,
      sourceFloorId: srcF1.id,
      sourceNodeId: nElev1.id,
      targetBuildingId: srcBld.id,
      targetFloorId: srcF1.id,
      targetNodeId: nEnd.id,
      connectionType: 'corridor',
      name: 'Upper Corridor',
      distanceMeters: 30,
      weightMultiplier: 1.0,
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
    });

    // Objects
    const objStart = objectStore.create({
      campusId: srcCampus.id,
      buildingId: srcBld.id,
      floorId: srcF0.id,
      code: 'START-REC',
      name: { en: 'Reception Office', fr: 'Bureau de Réception' },
      coordinates: { x: 10, y: 10 },
      associatedNodeId: nStart.id,
      isAccessible: true,
    });

    const objEnd = objectStore.create({
      campusId: srcCampus.id,
      buildingId: srcBld.id,
      floorId: srcF1.id,
      code: 'DEST-ROBO',
      name: { en: 'Robotics Center', fr: 'Centre de Robotique' },
      coordinates: { x: 60, y: 10 },
      associatedNodeId: nEnd.id,
      isAccessible: true,
      geometryType: 'polygon',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [[55, 5], [65, 5], [65, 15], [55, 15], [55, 5]],
        ],
      },
    });

    // 2. Compute reference route on source campus
    const sourceRoute = await routingService.calculateRoute(
      srcCampus.id,
      objStart.id,
      objEnd.id
    );

    expect(sourceRoute.success).toBe(true);
    expect(sourceRoute.data.nodes.length).toBe(4); // nStart -> nElev0 -> nElev1 -> nEnd
    expect(sourceRoute.data.totalDistanceMeters).toBe(54); // 20 + 4 + 30
    expect(sourceRoute.data.transitions.length).toBe(1);
    expect(sourceRoute.data.transitions[0].type).toBe('elevator');

    // 3. Export source campus to JSON bundle
    const exportedBundle = await campusImportExportService.exportCampus(srcCampus.id);

    // 4. Import bundle into an entirely new, isolated site
    const importResult = await campusImportExportService.importCampus(exportedBundle, {
      importMode: 'create_new_site',
      newCampusSlug: 'cloned-roundtrip-site',
      newCampusCode: 'CLONE-RTS',
      newCampusName: { en: 'Cloned Roundtrip Academy' },
    });

    expect(importResult.success).toBe(true);
    const newCampusId = importResult.campusId;
    expect(newCampusId).not.toBe(srcCampus.id);

    // 5. Verify isolated entities in new site
    const newObjects = objectStore.getByCampus(newCampusId);
    expect(newObjects.length).toBe(2);

    const newObjStart = newObjects.find(o => o.code === 'START-REC');
    const newObjEnd = newObjects.find(o => o.code === 'DEST-ROBO');

    expect(newObjStart).toBeDefined();
    expect(newObjEnd).toBeDefined();

    // Verify multilingual preservation
    expect(typeof newObjStart?.name).toBe('object');
    expect((newObjStart?.name as any)?.fr).toBe('Bureau de Réception');

    // Verify geometry preservation
    expect(newObjEnd?.geometry?.type).toBe('Polygon');
    expect(newObjEnd?.geometryType).toBe('polygon');

    // 6. Compute route on imported site between remapped objects
    const clonedRoute = await routingService.calculateRoute(
      newCampusId,
      newObjStart!.id,
      newObjEnd!.id
    );

    expect(clonedRoute.success).toBe(true);
    expect(clonedRoute.data.nodes.length).toBe(4);
    expect(clonedRoute.data.totalDistanceMeters).toBe(54); // Exact distance preserved!
    expect(clonedRoute.data.transitions.length).toBe(1);
    expect(clonedRoute.data.transitions[0].type).toBe('elevator'); // Vertical transition preserved!

    // Ensure all node IDs along the cloned route belong to the new campus, not source
    const newNodes = navStore.getNodesByCampus(newCampusId).map(n => n.id);
    for (const nid of clonedRoute.data.nodes) {
      expect(newNodes).toContain(nid);
      expect(nid).not.toBe(nStart.id);
      expect(nid).not.toBe(nEnd.id);
    }
  }, 30000);
});
