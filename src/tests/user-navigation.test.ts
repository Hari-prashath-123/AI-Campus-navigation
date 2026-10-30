import { describe, it, expect, beforeEach } from 'vitest';
import { objectService } from '../api/object.service';
import { routingService } from '../api/routing.service';
import { navStore } from '../api/nav.store';
import { objectStore } from '../api/object.store';
import { accessRuleService } from '../api/access-rule.service';
import { SpatialNode, CampusConnection } from '../types/connection';
import { MapObject } from '../types/object';

describe('User Navigation & Floor Transition Tests', () => {
  const campusId = 'campus-nav-test';
  const buildingId = 'bld-test';
  const groundFloorId = 'floor-g';
  const firstFloorId = 'floor-1';

  // Ground Floor Nodes
  const nodeGroundDoor: SpatialNode = {
    id: 'node-g-door',
    campusId,
    buildingId,
    floorId: groundFloorId,
    type: 'door',
    coordinates: { x: 50, y: 90 },
    isAccessible: true,
    label: 'Main Entrance Door',
  };

  const nodeGroundHall: SpatialNode = {
    id: 'node-g-hall',
    campusId,
    buildingId,
    floorId: groundFloorId,
    type: 'hallway',
    coordinates: { x: 50, y: 50 },
    isAccessible: true,
    label: 'Ground Central Hallway',
  };

  const nodeGroundRoom101: SpatialNode = {
    id: 'node-g-r101',
    campusId,
    buildingId,
    floorId: groundFloorId,
    type: 'door',
    coordinates: { x: 20, y: 50 },
    isAccessible: true,
    label: 'Room 101 Door',
  };

  const nodeGroundElevator: SpatialNode = {
    id: 'node-g-elev',
    campusId,
    buildingId,
    floorId: groundFloorId,
    type: 'elevator',
    coordinates: { x: 40, y: 30 },
    isAccessible: true,
    label: 'Ground Elevator',
  };

  const nodeGroundStairs: SpatialNode = {
    id: 'node-g-stairs',
    campusId,
    buildingId,
    floorId: groundFloorId,
    type: 'stairs',
    coordinates: { x: 60, y: 30 },
    isAccessible: false, // Inaccessible for wheelchairs
    label: 'Ground Stairs',
  };

  // Level 1 Nodes
  const nodeL1Hall: SpatialNode = {
    id: 'node-l1-hall',
    campusId,
    buildingId,
    floorId: firstFloorId,
    type: 'hallway',
    coordinates: { x: 50, y: 50 },
    isAccessible: true,
    label: 'Level 1 Central Hallway',
  };

  const nodeL1Lab201: SpatialNode = {
    id: 'node-l1-lab201',
    campusId,
    buildingId,
    floorId: firstFloorId,
    type: 'door',
    coordinates: { x: 20, y: 50 },
    isAccessible: true,
    label: 'Lab 201 Door',
  };

  const nodeL1Elevator: SpatialNode = {
    id: 'node-l1-elev',
    campusId,
    buildingId,
    floorId: firstFloorId,
    type: 'elevator',
    coordinates: { x: 40, y: 30 },
    isAccessible: true,
    label: 'Level 1 Elevator',
  };

  const nodeL1Stairs: SpatialNode = {
    id: 'node-l1-stairs',
    campusId,
    buildingId,
    floorId: firstFloorId,
    type: 'stairs',
    coordinates: { x: 60, y: 30 },
    isAccessible: false, // Inaccessible for wheelchairs
    label: 'Level 1 Stairs',
  };

  // Connections
  const connections: CampusConnection[] = [
    // Ground corridors
    {
      id: 'edge-g-door-hall',
      campusId,
      sourceNodeId: 'node-g-door',
      targetNodeId: 'node-g-hall',
      sourceFloorId: groundFloorId,
      targetFloorId: groundFloorId,
      connectionType: 'corridor',
      name: 'Main Lobby Walkway',
      distanceMeters: 40,
      weightMultiplier: 1.0,
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'edge-g-hall-r101',
      campusId,
      sourceNodeId: 'node-g-hall',
      targetNodeId: 'node-g-r101',
      sourceFloorId: groundFloorId,
      targetFloorId: groundFloorId,
      connectionType: 'door',
      name: 'Room 101 Access',
      distanceMeters: 30,
      weightMultiplier: 1.0,
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'edge-g-hall-elev',
      campusId,
      sourceNodeId: 'node-g-hall',
      targetNodeId: 'node-g-elev',
      sourceFloorId: groundFloorId,
      targetFloorId: groundFloorId,
      connectionType: 'corridor',
      name: 'Elevator Walkway Ground',
      distanceMeters: 22,
      weightMultiplier: 1.0,
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'edge-g-hall-stairs',
      campusId,
      sourceNodeId: 'node-g-hall',
      targetNodeId: 'node-g-stairs',
      sourceFloorId: groundFloorId,
      targetFloorId: groundFloorId,
      connectionType: 'corridor',
      name: 'Stairs Walkway Ground',
      distanceMeters: 22,
      weightMultiplier: 1.0,
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      createdAt: '',
      updatedAt: '',
    },

    // Level 1 corridors
    {
      id: 'edge-l1-hall-lab201',
      campusId,
      sourceNodeId: 'node-l1-hall',
      targetNodeId: 'node-l1-lab201',
      sourceFloorId: firstFloorId,
      targetFloorId: firstFloorId,
      connectionType: 'door',
      name: 'Lab 201 Access',
      distanceMeters: 30,
      weightMultiplier: 1.0,
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'edge-l1-hall-elev',
      campusId,
      sourceNodeId: 'node-l1-hall',
      targetNodeId: 'node-l1-elev',
      sourceFloorId: firstFloorId,
      targetFloorId: firstFloorId,
      connectionType: 'corridor',
      name: 'Elevator Walkway Level 1',
      distanceMeters: 22,
      weightMultiplier: 1.0,
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'edge-l1-hall-stairs',
      campusId,
      sourceNodeId: 'node-l1-hall',
      targetNodeId: 'node-l1-stairs',
      sourceFloorId: firstFloorId,
      targetFloorId: firstFloorId,
      connectionType: 'corridor',
      name: 'Stairs Walkway Level 1',
      distanceMeters: 22,
      weightMultiplier: 1.0,
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      createdAt: '',
      updatedAt: '',
    },

    // Vertical transition: Elevator shaft (Accessible)
    {
      id: 'edge-vertical-elevator',
      campusId,
      sourceNodeId: 'node-g-elev',
      targetNodeId: 'node-l1-elev',
      sourceFloorId: groundFloorId,
      targetFloorId: firstFloorId,
      connectionType: 'elevator',
      name: 'Passenger Elevator Shaft',
      distanceMeters: 4,
      weightMultiplier: 1.0,
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      createdAt: '',
      updatedAt: '',
    },

    // Vertical transition: Stairwell (Not Accessible for wheelchairs)
    {
      id: 'edge-vertical-stairs',
      campusId,
      sourceNodeId: 'node-g-stairs',
      targetNodeId: 'node-l1-stairs',
      sourceFloorId: groundFloorId,
      targetFloorId: firstFloorId,
      connectionType: 'staircase',
      name: 'Main Staircase Shaft',
      distanceMeters: 5,
      weightMultiplier: 2.0,
      isBidirectional: true,
      isAccessible: false, // Wheelchairs cannot use stairs
      isWalkable: true,
      isVehicleAccessible: false,
      createdAt: '',
      updatedAt: '',
    },
  ];

  const allNodes = [
    nodeGroundDoor, nodeGroundHall, nodeGroundRoom101, nodeGroundElevator, nodeGroundStairs,
    nodeL1Hall, nodeL1Lab201, nodeL1Elevator, nodeL1Stairs,
  ];

  let room101: MapObject;
  let lab201: MapObject;
  let mainEntrance: MapObject;

  beforeEach(() => {
    accessRuleService.reset([]);
    navStore.reset(allNodes, connections);

    objectStore.reset([]);
    room101 = objectStore.create({
      id: 'obj-room-101',
      campusId,
      buildingId,
      floorId: groundFloorId,
      code: 'R-101',
      name: { en: 'AI Innovation Lab 101' },
      category: 'lab',
      associatedNodeId: 'node-g-r101',
      coordinates: { x: 20, y: 50 },
      isAccessible: true,
    });

    lab201 = objectStore.create({
      id: 'obj-lab-201',
      campusId,
      buildingId,
      floorId: firstFloorId,
      code: 'L-201',
      name: { en: 'Robotics & Vision Lab 201' },
      category: 'lab',
      associatedNodeId: 'node-l1-lab201',
      coordinates: { x: 20, y: 50 },
      isAccessible: true,
    });

    mainEntrance = objectStore.create({
      id: 'obj-entrance',
      campusId,
      buildingId,
      floorId: groundFloorId,
      code: 'ENT-01',
      name: { en: 'Main Building Entrance' },
      category: 'entrance',
      associatedNodeId: 'node-g-door',
      coordinates: { x: 50, y: 90 },
      isAccessible: true,
    });
  });

  it('searches for rooms, labs, and entrances by code, name, and category', async () => {
    const searchByName = await objectService.searchObjects(campusId, 'Robotics');
    expect(searchByName.success).toBe(true);
    expect(searchByName.data.some(o => o.id === lab201.id)).toBe(true);

    const searchByCode = await objectService.searchObjects(campusId, 'R-101');
    expect(searchByCode.success).toBe(true);
    expect(searchByCode.data[0].id).toBe(room101.id);

    const searchByCategory = await objectService.searchObjects(campusId, 'entrance');
    expect(searchByCategory.success).toBe(true);
    expect(searchByCategory.data.some(o => o.category === 'entrance')).toBe(true);
  });

  it('calculates single-floor route with accurate distance and turn steps', async () => {
    const res = await routingService.calculateRoute(campusId, mainEntrance.id, room101.id, {
      mode: 'walking',
      accessibleOnly: false,
    });

    expect(res.success).toBe(true);
    const route = res.data;
    expect(route.success).toBe(true);
    expect(route.floors).toEqual([groundFloorId]);
    // Distance: 40m (door->hall) + 30m (hall->r101) = 70m
    expect(route.totalDistanceMeters).toBe(70);
    expect(route.estimatedTimeSeconds).toBeCloseTo(70 / 1.4, 1);
    expect(route.nodes).toEqual(['node-g-door', 'node-g-hall', 'node-g-r101']);

    // Turn-by-turn directions generated
    expect(route.steps).toBeDefined();
    expect(route.steps!.length).toBeGreaterThanOrEqual(3);
    expect(route.steps![0].turnType).toBe('depart');
    expect(route.steps![route.steps!.length - 1].turnType).toBe('arrive');
  });

  it('calculates multi-floor route with explicit elevator floor transition points', async () => {
    const res = await routingService.calculateRoute(campusId, room101.id, lab201.id, {
      mode: 'walking',
      accessibleOnly: false,
    });

    expect(res.success).toBe(true);
    const route = res.data;
    expect(route.success).toBe(true);

    // Visited floors contains both ground and first floor
    expect(route.floors).toContain(groundFloorId);
    expect(route.floors).toContain(firstFloorId);

    // Transitions record contains transition between ground and first floor
    expect(route.transitions.length).toBeGreaterThan(0);
    const transition = route.transitions[0];
    expect(transition.fromFloorId).toBe(groundFloorId);
    expect(transition.toFloorId).toBe(firstFloorId);
    expect(['elevator', 'staircase']).toContain(transition.type);

    // Steps include the floor transition step
    const transitionStep = route.steps?.find(s => s.turnType === 'elevator' || s.turnType === 'stairs');
    expect(transitionStep).toBeDefined();
  });

  it('strictly routes wheelchairs through elevator and avoids stairs', async () => {
    // With accessibleOnly = true, routing from room101 to lab201 MUST take elevator, not stairs
    const res = await routingService.calculateRoute(campusId, room101.id, lab201.id, {
      mode: 'walking',
      accessibleOnly: true,
    });

    expect(res.success).toBe(true);
    const route = res.data;
    expect(route.success).toBe(true);

    // Must contain elevator nodes and must NOT contain stairs nodes
    expect(route.nodes).toContain('node-g-elev');
    expect(route.nodes).toContain('node-l1-elev');
    expect(route.nodes).not.toContain('node-g-stairs');
    expect(route.nodes).not.toContain('node-l1-stairs');

    // Transitions must explicitly use elevator
    expect(route.transitions.every(t => t.type === 'elevator')).toBe(true);
  });

  it('respects temporary closures and maintenance access rules', async () => {
    // Create temporary maintenance closure on Lab 201
    const ruleRes = await accessRuleService.createRule({
      campusId,
      targetType: 'object',
      targetId: lab201.id,
      ruleType: 'maintenance',
      name: 'Hazardous Laser Alignment',
      closureReason: 'Lab 201 is closed during high-energy optical sensor calibration.',
      isRoutingBlocked: true,
    });
    expect(ruleRes.success).toBe(true);

    // Normal user routing to closed lab must be blocked
    const routeBlocked = await routingService.calculateRoute(campusId, room101.id, lab201.id, {
      mode: 'walking',
      accessibleOnly: false,
      allowRestricted: false,
    });

    expect(routeBlocked.success).toBe(false);
    expect(routeBlocked.data.message).toContain('optical sensor calibration');

    // Clean up rule
    await accessRuleService.deleteRule(ruleRes.data!.id);
  });

  it('returns clean failure without inventing routes when destination is disconnected', async () => {
    // Create an isolated room on a non-connected island
    const isolatedNode: SpatialNode = {
      id: 'node-isolated',
      campusId,
      buildingId,
      floorId: groundFloorId,
      type: 'door',
      coordinates: { x: 99, y: 99 },
      isAccessible: true,
    };
    navStore.createNode(isolatedNode);

    const isolatedRoom = objectStore.create({
      id: 'obj-isolated',
      campusId,
      buildingId,
      floorId: groundFloorId,
      code: 'ISOLATED-01',
      name: { en: 'Bunker 99' },
      category: 'room',
      associatedNodeId: 'node-isolated',
      coordinates: { x: 99, y: 99 },
      isAccessible: true,
    });

    const routeRes = await routingService.calculateRoute(campusId, room101.id, isolatedRoom.id, {
      mode: 'walking',
      accessibleOnly: false,
    });

    expect(routeRes.success).toBe(false);
    expect(routeRes.data.success).toBe(false);
    expect(routeRes.data.nodes.length).toBe(0);
    expect(routeRes.data.message).toContain('No valid route found');
  });
});
