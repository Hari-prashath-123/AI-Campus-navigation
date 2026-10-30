import { describe, it, expect } from 'vitest';
import { CampusGraphGenerator } from '../api/graph-generator.service';
import { RoutingEngine } from '../api/routing.service';
import { EditorShape, DEFAULT_CALIBRATION, MapCalibration } from '../types';
import { SpatialNode, CampusConnection } from '../types/connection';
import { MapObject } from '../types/object';

describe('CampusGraphGenerator & Routing Engine Verification', () => {
  const calibration: MapCalibration = {
    ...DEFAULT_CALIBRATION,
    canvasWidthPx: 1000,
    canvasHeightPx: 1000,
    realWidthMeters: 100, // 10 px = 1 meter
    realHeightMeters: 100,
    unitSystem: 'metric',
  };

  it('generates nodes and edges from explicitly walkable paths and junctions with deliberate snapping', () => {
    // Two walkable corridor paths that meet at (500, 500)
    // Path 1: (100, 500) -> (500, 500)
    // Path 2: (500, 500) -> (900, 500)
    const corridor1: EditorShape = {
      id: 'path-1',
      objectTypeId: 'corridor',
      geometryType: 'polyline',
      points: [100, 500, 500, 500],
      x: 100,
      y: 500,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      name: 'West Hallway',
      color: '#3b82f6',
      attributes: { isWalkable: true },
    };

    const corridor2: EditorShape = {
      id: 'path-2',
      objectTypeId: 'corridor',
      geometryType: 'polyline',
      points: [502, 501, 900, 500], // Within 0.8m snapping tolerance (8 px)
      x: 502,
      y: 501,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      name: 'East Hallway',
      color: '#3b82f6',
      attributes: { isWalkable: true },
    };

    const result = CampusGraphGenerator.generateGraph(
      'campus-1',
      'floor-1',
      'building-1',
      [corridor1, corridor2],
      [],
      [],
      [],
      calibration,
      { snapToleranceMeters: 0.8 }
    );

    // Expect 3 nodes: start of corridor 1, shared junction at (500, 500), and end of corridor 2
    expect(result.nodes.length).toBe(3);
    expect(result.connections.length).toBe(2);

    // Verify distance calculation in meters (400px = 40m)
    const conn1 = result.connections.find(c => c.name.includes('West Hallway'));
    expect(conn1).toBeDefined();
    expect(conn1!.distanceMeters).toBeCloseTo(40, 1);
  });

  it('does NOT create a junction where two paths cross geometrically without explicit snapped vertices', () => {
    // Requirement: "Never assume every geometric crossing is traversable."
    // Path A: horizontal line from (100, 500) to (900, 500)
    // Path B: vertical line from (500, 100) to (500, 900)
    // Neither path has an interior vertex at (500, 500). They simply cross.
    const pathA: EditorShape = {
      id: 'cross-h',
      objectTypeId: 'corridor',
      geometryType: 'polyline',
      points: [100, 500, 900, 500],
      x: 100,
      y: 500,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      name: 'Overpass Path',
      color: '#3b82f6',
    };

    const pathB: EditorShape = {
      id: 'cross-v',
      objectTypeId: 'corridor',
      geometryType: 'polyline',
      points: [500, 100, 500, 900],
      x: 500,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      name: 'Underpass Path',
      color: '#3b82f6',
    };

    const result = CampusGraphGenerator.generateGraph(
      'campus-1',
      'floor-1',
      'building-1',
      [pathA, pathB],
      [],
      [],
      [],
      calibration
    );

    // Expect exactly 4 endpoint nodes (2 for A, 2 for B) and 2 independent edges.
    // No junction node at (500, 500) is synthesized because geometric crossings are NOT assumed traversable!
    expect(result.nodes.length).toBe(4);
    expect(result.connections.length).toBe(2);

    // Verify RoutingEngine cannot traverse between Path A and Path B
    const startA = result.nodes.find(n => n.coordinates.x === 100)!.id;
    const endB = result.nodes.find(n => n.coordinates.y === 900)!.id;
    const router = new RoutingEngine(result.nodes, result.connections, []);
    const route = router.findRouteBetweenNodes(startA, endB, { mode: 'walking', accessibleOnly: false });
    expect(route.success).toBe(false);
  });

  it('associates rooms with multiple entrances and links entrances to nearby walkable paths', () => {
    // Room with 2 doors: Front Door and Back Door
    const roomShape: EditorShape = {
      id: 'room-shape-1',
      objectId: 'obj-room-1',
      objectTypeId: 'lecture-hall',
      geometryType: 'polygon',
      points: [100, 100, 300, 100, 300, 300, 100, 300],
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      name: 'Auditorium 101',
      color: '#10b981',
    };

    // Corridor running past the room at y = 350
    const corridorShape: EditorShape = {
      id: 'corridor-main',
      objectTypeId: 'corridor',
      geometryType: 'polyline',
      points: [50, 350, 400, 350],
      x: 50,
      y: 350,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      name: 'Main Hallway',
      color: '#3b82f6',
    };

    // Two door nodes along the south edge of the room
    const frontDoorNode: SpatialNode = {
      id: 'door-front',
      campusId: 'campus-1',
      floorId: 'floor-1',
      type: 'door',
      coordinates: { x: 150, y: 300 },
      isAccessible: true,
      label: 'Auditorium Front Door',
    };

    const backDoorNode: SpatialNode = {
      id: 'door-back',
      campusId: 'campus-1',
      floorId: 'floor-1',
      type: 'door',
      coordinates: { x: 250, y: 300 },
      isAccessible: true,
      label: 'Auditorium Back Door',
    };

    const roomObject: MapObject = {
      id: 'obj-room-1',
      campusId: 'campus-1',
      buildingId: 'building-1',
      floorId: 'floor-1',
      code: 'AUD-101',
      name: { en: 'Auditorium 101' },
      category: 'room',
      coordinates: { x: 20, y: 20 },
      associatedNodeId: '',
      isAccessible: true,
      createdAt: '',
      updatedAt: '',
    };

    const result = CampusGraphGenerator.generateGraph(
      'campus-1',
      'floor-1',
      'building-1',
      [roomShape, corridorShape],
      [frontDoorNode, backDoorNode],
      [],
      [roomObject],
      calibration,
      { autoAssociateRooms: true, doorSnapToleranceMeters: 10.0 }
    );

    const updatedRoom = result.updatedObjects.find(o => o.id === 'obj-room-1');
    expect(updatedRoom).toBeDefined();
    // Both doors are associated
    expect(updatedRoom!.entranceNodeIds).toContain('door-front');
    expect(updatedRoom!.entranceNodeIds).toContain('door-back');

    // Both doors have been connected to the corridor
    const doorConns = result.connections.filter(c => c.connectionType === 'door');
    expect(doorConns.length).toBe(2);
  });

  it('demonstrates that routes follow the drawn network and DO NOT pass through walls or room interiors', () => {
    // Room 1: (0..200, 0..200) -> Door at (100, 200)
    // Room 2: (200..400, 0..200) -> Door at (300, 200)
    // They share an interior wall at x = 200 from y = 0 to y = 200.
    // Walkable corridor path runs at y = 250 from (100, 250) to (300, 250).

    const door1: SpatialNode = {
      id: 'd1',
      campusId: 'c1',
      floorId: 'f1',
      buildingId: 'b1',
      type: 'door',
      coordinates: { x: 100, y: 200 },
      isAccessible: true,
      label: 'Room 1 Door',
    };

    const hallJunction1: SpatialNode = {
      id: 'h1',
      campusId: 'c1',
      floorId: 'f1',
      buildingId: 'b1',
      type: 'hallway',
      coordinates: { x: 100, y: 250 },
      isAccessible: true,
      label: 'Corridor J1',
    };

    const hallJunction2: SpatialNode = {
      id: 'h2',
      campusId: 'c1',
      floorId: 'f1',
      buildingId: 'b1',
      type: 'hallway',
      coordinates: { x: 300, y: 250 },
      isAccessible: true,
      label: 'Corridor J2',
    };

    const door2: SpatialNode = {
      id: 'd2',
      campusId: 'c1',
      floorId: 'f1',
      buildingId: 'b1',
      type: 'door',
      coordinates: { x: 300, y: 200 },
      isAccessible: true,
      label: 'Room 2 Door',
    };

    const connections: CampusConnection[] = [
      // Room 1 door to corridor J1
      {
        id: 'c-d1-h1',
        campusId: 'c1',
        sourceNodeId: 'd1',
        targetNodeId: 'h1',
        connectionType: 'door',
        name: 'Door 1 Transition',
        isBidirectional: true,
        isAccessible: true,
        isWalkable: true,
        isVehicleAccessible: false,
        distanceMeters: 5,
        weightMultiplier: 1.0,
        createdAt: '',
        updatedAt: '',
      },
      // Corridor segment from J1 to J2
      {
        id: 'c-h1-h2',
        campusId: 'c1',
        sourceNodeId: 'h1',
        targetNodeId: 'h2',
        connectionType: 'corridor',
        name: 'Main Corridor',
        isBidirectional: true,
        isAccessible: true,
        isWalkable: true,
        isVehicleAccessible: false,
        distanceMeters: 20,
        weightMultiplier: 1.0,
        createdAt: '',
        updatedAt: '',
      },
      // Corridor J2 to Room 2 door
      {
        id: 'c-h2-d2',
        campusId: 'c1',
        sourceNodeId: 'h2',
        targetNodeId: 'd2',
        connectionType: 'door',
        name: 'Door 2 Transition',
        isBidirectional: true,
        isAccessible: true,
        isWalkable: true,
        isVehicleAccessible: false,
        distanceMeters: 5,
        weightMultiplier: 1.0,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const objects: MapObject[] = [
      {
        id: 'room-1',
        campusId: 'c1',
        floorId: 'f1',
        buildingId: 'b1',
        code: 'R101',
        name: { en: 'Office 101' },
        category: 'room',
        coordinates: { x: 10, y: 10 },
        associatedNodeId: 'd1',
        isAccessible: true,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'room-2',
        campusId: 'c1',
        floorId: 'f1',
        buildingId: 'b1',
        code: 'R102',
        name: { en: 'Office 102' },
        category: 'room',
        coordinates: { x: 30, y: 10 },
        associatedNodeId: 'd2',
        isAccessible: true,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const router = new RoutingEngine([door1, hallJunction1, hallJunction2, door2], connections, objects);
    const result = router.findRoute('room-1', 'room-2', { mode: 'walking', accessibleOnly: false });

    expect(result.success).toBe(true);
    // Crucial: Route MUST follow d1 -> h1 -> h2 -> d2 (navigating through corridor),
    // and CANNOT jump straight from (10, 10) to (30, 10) through the interior wall!
    expect(result.nodes).toEqual(['d1', 'h1', 'h2', 'd2']);
    expect(result.totalDistanceMeters).toBe(30);
  });

  it('supports one-way paths, restricted areas, and wheelchair-accessible routing', () => {
    const nodes: SpatialNode[] = [
      { id: 'start', campusId: 'c1', type: 'hallway', coordinates: { x: 0, y: 0 }, isAccessible: true },
      { id: 'way1', campusId: 'c1', type: 'hallway', coordinates: { x: 10, y: 0 }, isAccessible: true },
      { id: 'way2', campusId: 'c1', type: 'hallway', coordinates: { x: 20, y: 0 }, isAccessible: false }, // Inaccessible
      { id: 'dest', campusId: 'c1', type: 'hallway', coordinates: { x: 30, y: 0 }, isAccessible: true },
      // Restricted security path
      { id: 'sec-way', campusId: 'c1', type: 'hallway', coordinates: { x: 15, y: -10 }, isAccessible: true, isRestricted: true },
    ];

    const connections: CampusConnection[] = [
      // One-way edge: start -> way1
      {
        id: 'conn-oneway',
        campusId: 'c1',
        sourceNodeId: 'start',
        targetNodeId: 'way1',
        connectionType: 'corridor',
        name: 'One Way Exit',
        isBidirectional: false, // ONE-WAY!
        isAccessible: true,
        isWalkable: true,
        isVehicleAccessible: false,
        distanceMeters: 10,
        weightMultiplier: 1.0,
        createdAt: '',
        updatedAt: '',
      },
      // Restricted shortcut: start -> sec-way -> dest
      {
        id: 'conn-sec-1',
        campusId: 'c1',
        sourceNodeId: 'start',
        targetNodeId: 'sec-way',
        connectionType: 'corridor',
        name: 'Security Vault Tunnel',
        isBidirectional: true,
        isAccessible: true,
        isWalkable: true,
        isVehicleAccessible: false,
        isRestricted: true, // RESTRICTED!
        distanceMeters: 5,
        weightMultiplier: 1.0,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'conn-sec-2',
        campusId: 'c1',
        sourceNodeId: 'sec-way',
        targetNodeId: 'dest',
        connectionType: 'corridor',
        name: 'Security Exit',
        isBidirectional: true,
        isAccessible: true,
        isWalkable: true,
        isVehicleAccessible: false,
        isRestricted: true,
        distanceMeters: 5,
        weightMultiplier: 1.0,
        createdAt: '',
        updatedAt: '',
      },
      // Inaccessible stairs: way1 -> way2 -> dest
      {
        id: 'conn-stairs',
        campusId: 'c1',
        sourceNodeId: 'way1',
        targetNodeId: 'dest',
        connectionType: 'staircase',
        name: 'Steep Steps',
        isBidirectional: true,
        isAccessible: false, // NOT ACCESSIBLE!
        isWalkable: true,
        isVehicleAccessible: false,
        distanceMeters: 10,
        weightMultiplier: 1.0,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const router = new RoutingEngine(nodes, connections, []);

    // Test 1: One-way path prevents reverse traversal (way1 -> start should fail)
    const reverseRoute = router.findRouteBetweenNodes('way1', 'start', { mode: 'walking', accessibleOnly: false });
    expect(reverseRoute.success).toBe(false);

    // Test 2: Standard user cannot use restricted vault path
    const publicRoute = router.findRouteBetweenNodes('start', 'dest', { mode: 'walking', accessibleOnly: false, allowRestricted: false });
    expect(publicRoute.success).toBe(true);
    // Must take public steps (start -> way1 -> dest)
    expect(publicRoute.nodes).toEqual(['start', 'way1', 'dest']);

    // Test 3: Authorized staff CAN use the restricted shortcut
    const staffRoute = router.findRouteBetweenNodes('start', 'dest', { mode: 'walking', accessibleOnly: false, allowRestricted: true });
    expect(staffRoute.success).toBe(true);
    expect(staffRoute.nodes).toEqual(['start', 'sec-way', 'dest']);
    expect(staffRoute.totalDistanceMeters).toBe(10); // 5 + 5

    // Test 4: Accessible-only mode blocks steep stairs
    const accessibleRoute = router.findRouteBetweenNodes('start', 'dest', { mode: 'walking', accessibleOnly: true, allowRestricted: false });
    expect(accessibleRoute.success).toBe(false); // No accessible path exists without vault
  });

  it('rebuilds graph incrementally preserving existing node labels and custom edge weights', () => {
    const existingNode: SpatialNode = {
      id: 'custom-node-id',
      campusId: 'campus-1',
      floorId: 'floor-1',
      type: 'hallway',
      coordinates: { x: 100, y: 100 },
      isAccessible: true,
      label: 'Main Information Desk Landmark', // Custom label
    };

    const existingEdge: CampusConnection = {
      id: 'custom-edge-id',
      campusId: 'campus-1',
      sourceNodeId: 'custom-node-id',
      targetNodeId: 'other-node-id',
      connectionType: 'corridor',
      name: 'Custom Quiet Zone Corridor',
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      distanceMeters: 25,
      weightMultiplier: 3.5, // Custom heavy weight
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const otherNode: SpatialNode = {
      id: 'other-node-id',
      campusId: 'campus-1',
      floorId: 'floor-1',
      type: 'hallway',
      coordinates: { x: 350, y: 100 },
      isAccessible: true,
    };

    const pathShape: EditorShape = {
      id: 'shape-path',
      objectTypeId: 'corridor',
      geometryType: 'polyline',
      points: [100, 100, 350, 100],
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      name: 'Hallway',
      color: '#3b82f6',
    };

    const result = CampusGraphGenerator.generateGraph(
      'campus-1',
      'floor-1',
      'building-1',
      [pathShape],
      [existingNode, otherNode],
      [existingEdge],
      [],
      calibration,
      { preserveMetadata: true }
    );

    const preservedNode = result.nodes.find(n => n.id === 'custom-node-id');
    expect(preservedNode).toBeDefined();
    expect(preservedNode!.label).toBe('Main Information Desk Landmark');

    const preservedEdge = result.connections.find(c => c.id === 'custom-edge-id');
    expect(preservedEdge).toBeDefined();
    expect(preservedEdge!.weightMultiplier).toBe(3.5);
    expect(preservedEdge!.name).toBe('Custom Quiet Zone Corridor');
  });

  it('prevents duplicate edges and dangling connections', () => {
    const nodes: SpatialNode[] = [
      { id: 'n1', campusId: 'c1', type: 'hallway', coordinates: { x: 0, y: 0 }, isAccessible: true },
      { id: 'n2', campusId: 'c1', type: 'hallway', coordinates: { x: 10, y: 0 }, isAccessible: true },
    ];

    const duplicateAndDanglingEdges: CampusConnection[] = [
      {
        id: 'e1',
        campusId: 'c1',
        sourceNodeId: 'n1',
        targetNodeId: 'n2',
        connectionType: 'corridor',
        name: 'Edge 1',
        isBidirectional: true,
        isAccessible: true,
        isWalkable: true,
        isVehicleAccessible: false,
        distanceMeters: 10,
        weightMultiplier: 1.0,
        createdAt: '',
        updatedAt: '',
      },
      // Duplicate of e1 in reverse
      {
        id: 'e2-dup',
        campusId: 'c1',
        sourceNodeId: 'n2',
        targetNodeId: 'n1',
        connectionType: 'corridor',
        name: 'Edge 1 Duplicate',
        isBidirectional: true,
        isAccessible: true,
        isWalkable: true,
        isVehicleAccessible: false,
        distanceMeters: 10,
        weightMultiplier: 1.0,
        createdAt: '',
        updatedAt: '',
      },
      // Dangling edge referencing non-existent target
      {
        id: 'e3-dangling',
        campusId: 'c1',
        sourceNodeId: 'n1',
        targetNodeId: 'non-existent-node',
        connectionType: 'corridor',
        name: 'Dangling Edge',
        isBidirectional: true,
        isAccessible: true,
        isWalkable: true,
        isVehicleAccessible: false,
        distanceMeters: 10,
        weightMultiplier: 1.0,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const result = CampusGraphGenerator.generateGraph(
      'c1',
      undefined,
      undefined,
      [],
      nodes,
      duplicateAndDanglingEdges,
      [],
      calibration
    );

    expect(result.connections.length).toBe(1);
    expect(result.connections[0].id).toBe('e1');
    expect(result.stats.duplicateEdgesRemovedCount).toBe(1);
    expect(result.stats.danglingEdgesRemovedCount).toBe(1);
  });
});

