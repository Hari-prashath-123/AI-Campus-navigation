import { describe, it, expect, beforeEach } from 'vitest';
import { organizationService } from '../api/organization.service';
import { campusService } from '../api/campus.service';
import { objectTypeService } from '../api/object-type.service';
import { objectStore } from '../api/object.store';
import { navStore } from '../api/nav.store';
import { connectionService } from '../api/connection.service';
import { accessRuleService } from '../api/access-rule.service';
import { campusImportExportService } from '../api/import-export.service';
import { RoutingEngine } from '../api/routing.service';
import { CampusConnection, SpatialNode } from '../types/connection';

describe('Complete Reusable Environment-Configuration Workflow', () => {
  beforeEach(() => {
    // Reset all stores to clean state before each test
    organizationService.reset();
    campusService.reset([], [], []);
    objectStore.reset([]);
    navStore.reset([], []);
    objectTypeService.reset();
    accessRuleService.reset([]);
  });

  it('creates and manages independent organizations, sites, and buildings with data isolation', async () => {
    // 1. Create two independent organizations
    const orgARes = await organizationService.createOrganization({
      slug: 'org-health',
      name: { en: 'Metropolitan Health Network' },
      contactEmail: 'contact@metrohealth.org',
    });
    const orgBRes = await organizationService.createOrganization({
      slug: 'org-tech',
      name: { en: 'Apex Institute of Technology' },
      contactEmail: 'admin@apextech.edu',
    });
    expect(orgARes.success).toBe(true);
    expect(orgBRes.success).toBe(true);

    const orgA = orgARes.data!;
    const orgB = orgBRes.data!;

    // 2. Create independent sites (campuses) for each organization
    const site1Res = await campusService.createCampus({
      organizationId: orgA.id,
      slug: 'metro-hospital-main',
      name: { en: 'Metro Central Hospital Site' },
      code: 'MCH',
      center: { lat: 40.7128, lng: -74.006 },
    });
    const site2Res = await campusService.createCampus({
      organizationId: orgB.id,
      slug: 'apex-north-campus',
      name: { en: 'Apex Tech North Campus' },
      code: 'ATN',
      center: { lat: 37.7749, lng: -122.4194 },
    });
    expect(site1Res.success).toBe(true);
    expect(site2Res.success).toBe(true);

    const site1 = site1Res.data!;
    const site2 = site2Res.data!;

    // 3. Verify data isolation between organizations
    const orgACampuses = await campusService.getCampuses(orgA.id);
    const orgBCampuses = await campusService.getCampuses(orgB.id);

    expect(orgACampuses.data.length).toBe(1);
    expect(orgACampuses.data[0].id).toBe(site1.id);
    expect(orgBCampuses.data.length).toBe(1);
    expect(orgBCampuses.data[0].id).toBe(site2.id);

    // 4. Create multiple buildings within Site 1
    const bld1Res = await campusService.createBuilding({
      campusId: site1.id,
      code: 'MED-A',
      name: { en: 'Clinical Pavilion' },
      totalFloors: 3,
    });
    const bld2Res = await campusService.createBuilding({
      campusId: site1.id,
      code: 'MED-B',
      name: { en: 'Diagnostics & Surgery Center' },
      totalFloors: 4,
    });

    expect(bld1Res.success).toBe(true);
    expect(bld2Res.success).toBe(true);

    const site1Buildings = await campusService.getBuildingsByCampus(site1.id);
    const site2Buildings = await campusService.getBuildingsByCampus(site2.id);

    expect(site1Buildings.data.length).toBe(2);
    expect(site2Buildings.data.length).toBe(0); // strict isolation: site 2 has no buildings
  });

  it('configures floors with levels, dimensions, plan images, and supports floor duplication', async () => {
    const campusRes = await campusService.createCampus({
      name: { en: 'Innovation Campus' },
      code: 'INN',
    });
    const campus = campusRes.data!;

    const bldRes = await campusService.createBuilding({
      campusId: campus.id,
      code: 'ENG',
      name: { en: 'Engineering Hall' },
    });
    const building = bldRes.data!;

    // Add basement (-1), ground (0), and level 1
    const floorB1 = await campusService.createFloor({
      campusId: campus.id,
      buildingId: building.id,
      level: -1,
      code: 'B1',
      name: { en: 'Basement Laboratory & Server Vault' },
      dimensions: { widthMeters: 80, heightMeters: 60 },
      planImageUrl: 'https://storage.omnicampus.app/floors/b1-plan.png',
    });

    const floorG = await campusService.createFloor({
      campusId: campus.id,
      buildingId: building.id,
      level: 0,
      code: 'L0',
      name: { en: 'Ground Lobby & Reception' },
      dimensions: { widthMeters: 100, heightMeters: 75 },
      planImageUrl: 'https://storage.omnicampus.app/floors/g-plan.png',
    });

    expect(floorB1.success).toBe(true);
    expect(floorG.success).toBe(true);
    expect(floorB1.data!.level).toBe(-1);
    expect(floorG.data!.dimensions.widthMeters).toBe(100);

    // Add a room to Ground floor
    objectStore.create({
      campusId: campus.id,
      buildingId: building.id,
      floorId: floorG.data!.id,
      code: 'CONF-01',
      name: { en: 'Executive Conference Room' },
      category: 'room',
    });

    // Duplicate Ground Floor to Level 1, including objects
    const dupRes = await campusService.duplicateFloor(
      floorG.data!.id,
      1,
      { en: 'First Floor Suites' },
      true
    );
    expect(dupRes.success).toBe(true);
    expect(dupRes.data!.level).toBe(1);
    expect(dupRes.data!.dimensions.widthMeters).toBe(100);

    // Verify duplicated object was created for Level 1
    const l1Objects = objectStore.getByFloor(dupRes.data!.id);
    expect(l1Objects.length).toBe(1);
    expect(l1Objects[0].code).toBe('CONF-01-L1');

    // Duplicate level conflict check: attempting to duplicate to level 1 again should fail
    const conflictRes = await campusService.duplicateFloor(floorG.data!.id, 1);
    expect(conflictRes.success).toBe(false);
    expect(conflictRes.message).toContain('already exists');
  });

  it('defines reusable object types with property schemas, default values, and prevents deletion if in use', async () => {
    // Define a custom object type: "Bio-Safety Laboratory"
    const typeRes = await objectTypeService.create({
      slug: 'bio-safety-lab',
      name: 'Bio-Safety Cleanroom',
      description: 'Controlled environment laboratory with airlock and pressure monitoring.',
      category: 'room',
      iconName: 'ShieldAlert',
      color: '#059669',
      isNavigable: true,
      isBarrier: false,
      isConnector: false,
      propertyDefinitions: [
        {
          id: 'p-bsl-1',
          key: 'biosafety_level',
          label: 'Biosafety Level',
          type: 'select',
          required: true,
          isVisibleOnCard: true,
          isSearchable: true,
          sortOrder: 1,
          defaultValue: 'BSL-2',
          options: [
            { value: 'BSL-1', label: 'BSL-1 (Basic)' },
            { value: 'BSL-2', label: 'BSL-2 (Moderate)' },
            { value: 'BSL-3', label: 'BSL-3 (High Containment)' },
          ],
        },
        {
          id: 'p-bsl-2',
          key: 'air_pressure_pa',
          label: 'Negative Pressure (Pa)',
          type: 'number',
          required: false,
          isVisibleOnCard: false,
          isSearchable: false,
          sortOrder: 2,
          defaultValue: -30,
          unit: 'Pa',
        },
        {
          id: 'p-bsl-3',
          key: 'requires_protective_gear',
          label: 'Requires PPE',
          type: 'boolean',
          required: true,
          isVisibleOnCard: true,
          isSearchable: false,
          sortOrder: 3,
          defaultValue: true,
        },
      ],
    });

    expect(typeRes.success).toBe(true);
    const customType = typeRes.data!;

    // Test default properties helper
    const defaults = objectTypeService.getDefaultProperties(customType.id);
    expect(defaults).toEqual({
      biosafety_level: 'BSL-2',
      air_pressure_pa: -30,
      requires_protective_gear: true,
    });

    // Create an object referencing this custom object type
    const labObj = objectStore.create({
      code: 'LAB-BSL-201',
      name: { en: 'Virology Cleanroom 201' },
      objectTypeId: customType.id,
      category: 'room',
      properties: {
        ...defaults,
        air_pressure_pa: -45, // custom override
      },
    });
    expect(labObj.properties?.air_pressure_pa).toBe(-45);
    expect(labObj.properties?.biosafety_level).toBe('BSL-2');

    // Attempting to delete the custom object type while labObj exists must fail
    await expect(objectTypeService.delete(customType.id)).rejects.toThrow(/referenced by 1 object/);

    // Deleting the object allows the object type to be safely deleted
    objectStore.delete(labObj.id);
    const deleteRes = await objectTypeService.delete(customType.id);
    expect(deleteRes.success).toBe(true);
  });

  it('manages object instances safely: create, edit, duplicate, archive, and internal sub-zones within rooms', () => {
    // 1. Create a parent room (e.g. AI Research Lab)
    const parentRoom = objectStore.create({
      code: 'LAB-AI-100',
      name: { en: 'Main AI & Robotics Research Laboratory' },
      category: 'room',
      coordinates: { x: 50, y: 50 },
    });

    // 2. Add internal sub-zones within the room
    const workstationZone = objectStore.createChildZone(parentRoom.id, {
      code: 'ZONE-WS-A',
      name: { en: 'Neural Network Cluster Workstations' },
      subZoneType: 'workstation',
      coordinates: { x: 52, y: 54 },
    });

    const cabinZone = objectStore.createChildZone(parentRoom.id, {
      code: 'ZONE-CAB-1',
      name: { en: 'Lead Scientist Office Cabin' },
      subZoneType: 'cabin',
      coordinates: { x: 60, y: 58 },
    });

    // Verify sub-zone retrieval
    const childZones = objectStore.getChildZones(parentRoom.id);
    expect(childZones.length).toBe(2);
    expect(childZones.map(z => z.code)).toContain('ZONE-WS-A');
    expect(childZones.map(z => z.code)).toContain('ZONE-CAB-1');

    // 3. Duplicate an object
    const duplicatedCabin = objectStore.duplicate(cabinZone.id, {
      code: 'ZONE-CAB-2',
      name: { en: 'Co-Investigator Office Cabin' },
    });
    expect(duplicatedCabin.code).toBe('ZONE-CAB-2');
    expect(duplicatedCabin.parentObjectId).toBe(parentRoom.id);
    expect(duplicatedCabin.coordinates.x).toBe(cabinZone.coordinates.x + 2);

    // 4. Archive and unarchive
    objectStore.archive(workstationZone.id);
    const activeObjects = objectStore.getAll(false);
    expect(activeObjects.some(o => o.id === workstationZone.id)).toBe(false);

    const allObjectsWithArchived = objectStore.getAll(true);
    expect(allObjectsWithArchived.some(o => o.id === workstationZone.id)).toBe(true);

    objectStore.unarchive(workstationZone.id);
    expect(objectStore.getAll(false).some(o => o.id === workstationZone.id)).toBe(true);

    // 5. Safe deletion check: deleting parentRoom without force should be blocked
    const canDeleteParent = objectStore.canDelete(parentRoom.id);
    expect(canDeleteParent.canDelete).toBe(false);
    expect(canDeleteParent.childZonesCount).toBeGreaterThanOrEqual(2);

    const deleteAttempt = objectStore.delete(parentRoom.id, false);
    expect(deleteAttempt).toBe(false); // protected!
    expect(objectStore.getById(parentRoom.id)).toBeDefined();

    // Forced deletion cleanly cascades
    const forcedDelete = objectStore.delete(parentRoom.id, true);
    expect(forcedDelete).toBe(true);
    expect(objectStore.getById(parentRoom.id)).toBeUndefined();
    expect(objectStore.getChildZones(parentRoom.id).length).toBe(0);
  });

  it('configures access schedules, temporary closures, and dynamic routing enforcement', async () => {
    // Graph setup:
    // Room 1 (with door D1) -> Corridor edge E1 -> Room 2 (with door D2)
    const nodeD1: SpatialNode = { id: 'd1', campusId: 'c1', floorId: 'f1', type: 'door', coordinates: { x: 10, y: 10 }, isAccessible: true };
    const nodeD2: SpatialNode = { id: 'd2', campusId: 'c1', floorId: 'f1', type: 'door', coordinates: { x: 30, y: 10 }, isAccessible: true };

    const edgeE1: CampusConnection = {
      id: 'e1',
      campusId: 'c1',
      sourceNodeId: 'd1',
      targetNodeId: 'd2',
      connectionType: 'corridor',
      name: 'Hallway',
      distanceMeters: 20,
      weightMultiplier: 1.0,
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      createdAt: '',
      updatedAt: '',
    };

    const room1 = objectStore.create({
      id: 'room-1',
      campusId: 'c1',
      floorId: 'f1',
      code: 'R101',
      name: { en: 'Room 101' },
      associatedNodeId: 'd1',
      coordinates: { x: 10, y: 5 },
    });

    const room2 = objectStore.create({
      id: 'room-2',
      campusId: 'c1',
      floorId: 'f1',
      code: 'R102',
      name: { en: 'Room 102' },
      associatedNodeId: 'd2',
      coordinates: { x: 30, y: 5 },
    });

    const router = new RoutingEngine([nodeD1, nodeD2], [edgeE1], [room1, room2]);

    // 1. Normal route between room-1 and room-2 should succeed
    const route1 = router.findRoute('room-1', 'room-2', { mode: 'walking', accessibleOnly: false });
    expect(route1.success).toBe(true);
    expect(route1.totalDistanceMeters).toBe(20);

    // 2. Create a temporary maintenance closure on room-2
    const closureRule = await accessRuleService.createRule({
      campusId: 'c1',
      targetType: 'object',
      targetId: 'room-2',
      ruleType: 'maintenance',
      name: 'Scheduled Chemical Sterilization',
      closureReason: 'Room is temporarily closed for biological containment sterilization.',
      isRoutingBlocked: true,
    });
    expect(closureRule.success).toBe(true);

    // Routing without allowRestricted should now be blocked
    const routeClosed = router.findRoute('room-1', 'room-2', { mode: 'walking', accessibleOnly: false, allowRestricted: false });
    expect(routeClosed.success).toBe(false);
    expect(routeClosed.message).toContain('sterilization');

    // Authorized staff with allowRestricted CAN route to room-2
    const routeStaff = router.findRoute('room-1', 'room-2', { mode: 'walking', accessibleOnly: false, allowRestricted: true });
    expect(routeStaff.success).toBe(true);

    // Clean up rule
    await accessRuleService.deleteRule(closureRule.data!.id);
  });

  it('connects multiple floors via shared staircases/elevators and buildings via outdoor paths/bridges', async () => {
    const campusId = 'camp-conn-test';
    const buildingA = 'bld-a';
    const buildingB = 'bld-b';

    // 1. Floor nodes for vertical transition across 3 floors in Building A
    const nodeL0: SpatialNode = { id: 'node-elev-l0', campusId, buildingId: buildingA, floorId: 'f0', type: 'elevator', coordinates: { x: 20, y: 20 }, isAccessible: true };
    const nodeL1: SpatialNode = { id: 'node-elev-l1', campusId, buildingId: buildingA, floorId: 'f1', type: 'elevator', coordinates: { x: 20, y: 20 }, isAccessible: true };
    const nodeL2: SpatialNode = { id: 'node-elev-l2', campusId, buildingId: buildingA, floorId: 'f2', type: 'elevator', coordinates: { x: 20, y: 20 }, isAccessible: true };
    [nodeL0, nodeL1, nodeL2].forEach(n => navStore.createNode(n));

    // Create vertical elevator shaft connecting Floor 0 <-> Floor 1 <-> Floor 2
    const elevTransition = await connectionService.createVerticalTransition({
      campusId,
      buildingId: buildingA,
      connectorType: 'elevator',
      shaftName: 'Central Passenger Elevator A',
      floorNodePairs: [
        { floorId: 'f0', nodeId: 'node-elev-l0' },
        { floorId: 'f1', nodeId: 'node-elev-l1' },
        { floorId: 'f2', nodeId: 'node-elev-l2' },
      ],
      isAccessible: true,
    });

    expect(elevTransition.success).toBe(true);
    expect(elevTransition.data.length).toBe(2); // (f0 <-> f1) and (f1 <-> f2)
    expect(elevTransition.data[0].connectionType).toBe('elevator');
    expect(elevTransition.data[0].isAccessible).toBe(true);
    expect(elevTransition.data[0].weightMultiplier).toBe(1.2);

    // 2. Connect Building A to Building B via an elevated 2nd-floor skybridge
    const bridgeNodeA: SpatialNode = { id: 'node-bridge-a', campusId, buildingId: buildingA, floorId: 'f2', type: 'hallway', coordinates: { x: 80, y: 20 }, isAccessible: true };
    const bridgeNodeB: SpatialNode = { id: 'node-bridge-b', campusId, buildingId: buildingB, floorId: 'f2-b', type: 'hallway', coordinates: { x: 120, y: 20 }, isAccessible: true };
    navStore.createNode(bridgeNodeA);
    navStore.createNode(bridgeNodeB);

    const bridgeRes = await connectionService.createInterBuildingConnection({
      campusId,
      name: 'Skybridge Link (Building A ↔ Building B)',
      sourceBuildingId: buildingA,
      sourceFloorId: 'f2',
      sourceNodeId: 'node-bridge-a',
      targetBuildingId: buildingB,
      targetFloorId: 'f2-b',
      targetNodeId: 'node-bridge-b',
      connectionType: 'bridge',
      distanceMeters: 40,
      isAccessible: true,
      isBidirectional: true,
    });

    expect(bridgeRes.success).toBe(true);
    expect(bridgeRes.data!.connectionType).toBe('bridge');
    expect(bridgeRes.data!.sourceBuildingId).toBe(buildingA);
    expect(bridgeRes.data!.targetBuildingId).toBe(buildingB);
    expect(bridgeRes.data!.distanceMeters).toBe(40);
  });

  it('validates references before deletion and prevents accidental cascading deletion', async () => {
    // Create site with a building, floor, and object
    const site = (await campusService.createCampus({ name: { en: 'Protected Site' } })).data!;
    const bld = (await campusService.createBuilding({ campusId: site.id, name: { en: 'Protected Building' } })).data!;
    const flr = (await campusService.createFloor({ campusId: site.id, buildingId: bld.id, level: 0 })).data!;
    const obj = objectStore.create({ campusId: site.id, buildingId: bld.id, floorId: flr.id, code: 'PROTECTED-OBJ' });

    // 1. Delete floor without force: blocked because object exists
    const deleteFloorSafe = await campusService.deleteFloor(flr.id, false);
    expect(deleteFloorSafe.success).toBe(false);
    expect(deleteFloorSafe.message).toContain('Cannot delete floor safely');

    // 2. Delete building without force: blocked because floor exists
    const deleteBldSafe = await campusService.deleteBuilding(bld.id, false);
    expect(deleteBldSafe.success).toBe(false);
    expect(deleteBldSafe.message).toContain('Cannot delete building safely');

    // 3. Delete campus without force: blocked because buildings exist
    const deleteCampusSafe = await campusService.deleteCampus(site.id, false);
    expect(deleteCampusSafe.success).toBe(false);
    expect(deleteCampusSafe.message).toContain('Cannot delete campus safely');

    // 4. Force delete campus cleanly cascades and clears dependent entities
    const deleteCampusForce = await campusService.deleteCampus(site.id, true);
    expect(deleteCampusForce.success).toBe(true);
    expect((await campusService.getCampusById(site.id)).success).toBe(false);
    expect((await campusService.getBuildingById(bld.id)).success).toBe(false);
    expect((await campusService.getFloorById(flr.id)).success).toBe(false);
    expect(objectStore.getById(obj.id)).toBeUndefined();
  });

  it('exports an environment configuration and imports it into another site with complete data isolation', async () => {
    // 1. Set up source site
    const srcCampus = (await campusService.createCampus({
      slug: 'original-tech-center',
      code: 'OTC',
      name: { en: 'Original Tech Center' },
      description: { en: 'Source campus to export' },
    })).data!;

    const srcBld = (await campusService.createBuilding({
      campusId: srcCampus.id,
      code: 'MAIN-B',
      name: { en: 'Main Block' },
      totalFloors: 1,
    })).data!;

    const srcFloor = (await campusService.createFloor({
      campusId: srcCampus.id,
      buildingId: srcBld.id,
      level: 0,
      code: 'G-FLR',
      name: { en: 'Ground Floor' },
      dimensions: { widthMeters: 50, heightMeters: 50 },
    })).data!;

    const srcNode1 = navStore.createNode({
      campusId: srcCampus.id,
      buildingId: srcBld.id,
      floorId: srcFloor.id,
      type: 'door',
      coordinates: { x: 10, y: 10 },
      label: 'Main Door',
      isAccessible: true,
    });

    const srcNode2 = navStore.createNode({
      campusId: srcCampus.id,
      buildingId: srcBld.id,
      floorId: srcFloor.id,
      type: 'hallway',
      coordinates: { x: 20, y: 10 },
      label: 'Central Hub',
      isAccessible: true,
    });

    navStore.createConnection({
      campusId: srcCampus.id,
      sourceBuildingId: srcBld.id,
      sourceFloorId: srcFloor.id,
      sourceNodeId: srcNode1.id,
      targetBuildingId: srcBld.id,
      targetFloorId: srcFloor.id,
      targetNodeId: srcNode2.id,
      connectionType: 'corridor',
      name: 'Corridor Connection',
      distanceMeters: 10,
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      weightMultiplier: 1.0,
    });

    const srcRoom = objectStore.create({
      campusId: srcCampus.id,
      buildingId: srcBld.id,
      floorId: srcFloor.id,
      code: 'SRC-ROOM-1',
      name: { en: 'Server Lab' },
      associatedNodeId: srcNode1.id,
      coordinates: { x: 10, y: 10 },
    });

    // 2. Export campus to bundle
    const bundle = await campusImportExportService.exportCampus(srcCampus.id);
    expect(bundle.campus.id).toBe(srcCampus.id);
    expect(bundle.buildings.length).toBe(1);
    expect(bundle.floors.length).toBe(1);
    expect(bundle.objects.length).toBe(1);
    expect(bundle.nodes.length).toBe(2);
    expect(bundle.connections.length).toBe(1);

    // 3. Import bundle into another site with 'create_new_site'
    const importResult = await campusImportExportService.importCampus(bundle, {
      importMode: 'create_new_site',
      targetOrganizationId: 'org-destination',
      newCampusSlug: 'destination-campus',
      newCampusCode: 'DEST-01',
      newCampusName: { en: 'Destination Campus' },
    });

    expect(importResult.success).toBe(true);
    const newCampusId = importResult.campusId;
    expect(newCampusId).not.toBe(srcCampus.id); // fresh isolated ID

    // 4. Verify data isolation & topology
    const destBuildings = await campusService.getBuildingsByCampus(newCampusId);
    expect(destBuildings.data.length).toBe(1);
    expect(destBuildings.data[0].id).not.toBe(srcBld.id); // remapped ID

    const destFloors = await campusService.getFloorsByBuilding(destBuildings.data[0].id);
    expect(destFloors.data.length).toBe(1);
    expect(destFloors.data[0].id).not.toBe(srcFloor.id); // remapped ID

    const destObjects = objectStore.getByCampus(newCampusId);
    expect(destObjects.length).toBe(1);
    expect(destObjects[0].id).not.toBe(srcRoom.id); // remapped ID
    expect(destObjects[0].buildingId).toBe(destBuildings.data[0].id);
    expect(destObjects[0].floorId).toBe(destFloors.data[0].id);

    const destNodes = navStore.getNodesByCampus(newCampusId);
    expect(destNodes.length).toBe(2);
    expect(destNodes[0].id).not.toBe(srcNode1.id);
    expect(destNodes[1].id).not.toBe(srcNode2.id);

    const destConns = navStore.getConnectionsByCampus(newCampusId);
    expect(destConns.length).toBe(1);
    // Connection endpoints are remapped to new nodes
    expect(destNodes.map(n => n.id)).toContain(destConns[0].sourceNodeId);
    expect(destNodes.map(n => n.id)).toContain(destConns[0].targetNodeId);

    // Source site entities were NOT touched or corrupted
    const srcObjectsNow = objectStore.getByCampus(srcCampus.id);
    expect(srcObjectsNow.length).toBe(1);
    expect(srcObjectsNow[0].id).toBe(srcRoom.id);
  });
});

