import { describe, it, expect, beforeEach } from 'vitest';
import { RoutingEngine } from '../api/routing.service';
import { SpatialNode, CampusConnection } from '../types/connection';
import { MapObject } from '../types/object';

describe('RoutingEngine', () => {
  let nodes: SpatialNode[] = [];
  let connections: CampusConnection[] = [];
  let objects: MapObject[] = [];

  beforeEach(() => {
    // Setup a mini campus for testing
    nodes = [
      { id: 'n1', campusId: 'c1', floorId: 'f1', buildingId: 'b1', type: 'door', coordinates: { x: 0, y: 0 }, isAccessible: true },
      { id: 'n2', campusId: 'c1', floorId: 'f1', buildingId: 'b1', type: 'hallway', coordinates: { x: 10, y: 0 }, isAccessible: true },
      { id: 'n3', campusId: 'c1', floorId: 'f1', buildingId: 'b1', type: 'stairs', coordinates: { x: 20, y: 0 }, isAccessible: true },
      { id: 'n4', campusId: 'c1', floorId: 'f2', buildingId: 'b1', type: 'stairs', coordinates: { x: 20, y: 0 }, isAccessible: true },
      { id: 'n5', campusId: 'c1', floorId: 'f2', buildingId: 'b1', type: 'door', coordinates: { x: 30, y: 0 }, isAccessible: true },
      { id: 'n6', campusId: 'c1', floorId: 'f2', buildingId: 'b2', type: 'door', coordinates: { x: 100, y: 0 }, isAccessible: true },
      // Elevator
      { id: 'e1', campusId: 'c1', floorId: 'f1', buildingId: 'b1', type: 'elevator', coordinates: { x: 5, y: 5 }, isAccessible: true },
      { id: 'e2', campusId: 'c1', floorId: 'f2', buildingId: 'b1', type: 'elevator', coordinates: { x: 5, y: 5 }, isAccessible: true },
    ];

    objects = [
      { id: 'objA', campusId: 'c1', floorId: 'f1', buildingId: 'b1', name: 'Room A', associatedNodeId: 'n1' } as unknown as MapObject,
      { id: 'objB', campusId: 'c1', floorId: 'f1', buildingId: 'b1', name: 'Hall', associatedNodeId: 'n2' } as unknown as MapObject,
      { id: 'objC', campusId: 'c1', floorId: 'f2', buildingId: 'b1', name: 'Room C', associatedNodeId: 'n5' } as unknown as MapObject,
      { id: 'objD', campusId: 'c1', floorId: 'f2', buildingId: 'b2', name: 'Other Bldg Room', associatedNodeId: 'n6' } as unknown as MapObject,
      { id: 'objE', campusId: 'c1', floorId: 'f1', buildingId: 'b1', name: 'Unreachable Room', associatedNodeId: 'n_none' } as unknown as MapObject,
    ];

    connections = [
      // Same floor route
      { id: 'c1', campusId: 'c1', sourceNodeId: 'n1', targetNodeId: 'n2', connectionType: 'corridor', isBidirectional: true, isAccessible: true, isWalkable: true, isVehicleAccessible: false, distanceMeters: 10, weightMultiplier: 1 } as CampusConnection,
      { id: 'c2', campusId: 'c1', sourceNodeId: 'n2', targetNodeId: 'n3', connectionType: 'corridor', isBidirectional: true, isAccessible: true, isWalkable: true, isVehicleAccessible: false, distanceMeters: 10, weightMultiplier: 1 } as CampusConnection,
      
      // Stairs (multi-floor, not accessible)
      { id: 'c3', campusId: 'c1', sourceNodeId: 'n3', targetNodeId: 'n4', sourceFloorId: 'f1', targetFloorId: 'f2', connectionType: 'staircase', isBidirectional: true, isAccessible: false, isWalkable: true, isVehicleAccessible: false, distanceMeters: 5, weightMultiplier: 2 } as CampusConnection,
      
      // Elevator (multi-floor, accessible)
      { id: 'ce1', campusId: 'c1', sourceNodeId: 'n1', targetNodeId: 'e1', connectionType: 'corridor', isBidirectional: true, isAccessible: true, isWalkable: true, isVehicleAccessible: false, distanceMeters: 5, weightMultiplier: 1 } as CampusConnection,
      { id: 'ce2', campusId: 'c1', sourceNodeId: 'e1', targetNodeId: 'e2', sourceFloorId: 'f1', targetFloorId: 'f2', connectionType: 'elevator', isBidirectional: true, isAccessible: true, isWalkable: true, isVehicleAccessible: false, distanceMeters: 5, weightMultiplier: 1 } as CampusConnection,
      { id: 'ce3', campusId: 'c1', sourceNodeId: 'e2', targetNodeId: 'n5', connectionType: 'corridor', isBidirectional: true, isAccessible: true, isWalkable: true, isVehicleAccessible: false, distanceMeters: 25, weightMultiplier: 1 } as CampusConnection,

      // Floor 2 corridor
      { id: 'c4', campusId: 'c1', sourceNodeId: 'n4', targetNodeId: 'n5', connectionType: 'corridor', isBidirectional: true, isAccessible: true, isWalkable: true, isVehicleAccessible: false, distanceMeters: 10, weightMultiplier: 1 } as CampusConnection,
      
      // Bridge (b1 -> b2)
      { id: 'c5', campusId: 'c1', sourceNodeId: 'n5', targetNodeId: 'n6', sourceBuildingId: 'b1', targetBuildingId: 'b2', sourceFloorId: 'f2', targetFloorId: 'f2', connectionType: 'bridge', isBidirectional: true, isAccessible: true, isWalkable: true, isVehicleAccessible: true, distanceMeters: 70, weightMultiplier: 1 } as CampusConnection,
    ];
  });

  it('calculates same-floor route', () => {
    const engine = new RoutingEngine(nodes, connections, objects);
    const result = engine.findRoute('objA', 'objB', { mode: 'walking', accessibleOnly: false });
    
    expect(result.success).toBe(true);
    expect(result.nodes).toEqual(['n1', 'n2']);
    expect(result.totalDistanceMeters).toBe(10);
    expect(result.floors).toEqual(['f1']);
  });

  it('calculates multi-floor route (stairs preferred for short distance)', () => {
    // Stairs: n1 -> n2(10) -> n3(10) -> n4(10) -> n5(10) = cost 40
    // n1 -> n2(10) -> n3(10) -> n4(10*2) -> n5(10) = 50 cost (35 meters actual)
    // n1 -> e1(5) -> e2(5) -> n5(25) = 35 cost (35 meters actual)
    // Wait, 35 cost is better than 50 cost! Elevator is actually cheaper here due to stair weight=2.
    // Let's modify the elevator distance to make it longer so stairs win when not accessible.
    
    // Modify elevator distance for this test
    const ce3 = connections.find(c => c.id === 'ce3')!;
    ce3.distanceMeters = 50; 
    // n1 -> e1(5) -> e2(5) -> n5(50) = 60 cost
    // Stairs: n1 -> n2(10) -> n3(10) -> n4(10) -> n5(10) = cost 40
    
    const engine2 = new RoutingEngine(nodes, connections, objects);
    const result = engine2.findRoute('objA', 'objC', { mode: 'walking', accessibleOnly: false });
    
    expect(result.success).toBe(true);
    expect(result.nodes).toEqual(['n1', 'n2', 'n3', 'n4', 'n5']);
    expect(result.transitions).toHaveLength(1);
    expect(result.transitions[0].type).toBe('staircase');
    expect(result.floors).toContain('f1');
    expect(result.floors).toContain('f2');
  });

  it('calculates accessible route', () => {
    const engine = new RoutingEngine(nodes, connections, objects);
    const result = engine.findRoute('objA', 'objC', { mode: 'walking', accessibleOnly: true });
    
    expect(result.success).toBe(true);
    // Should take elevator because stairs isAccessible = false
    expect(result.nodes).toEqual(['n1', 'e1', 'e2', 'n5']);
    expect(result.transitions[0].type).toBe('elevator');
  });

  it('calculates bridge route', () => {
    const engine = new RoutingEngine(nodes, connections, objects);
    const result = engine.findRoute('objC', 'objD', { mode: 'walking', accessibleOnly: false });
    
    expect(result.success).toBe(true);
    expect(result.nodes).toEqual(['n5', 'n6']);
    expect(result.transitions[0].type).toBe('bridge');
    expect(result.buildings).toContain('b1');
    expect(result.buildings).toContain('b2');
  });

  it('handles unreachable destination', () => {
    const engine = new RoutingEngine(nodes, connections, objects);
    const result = engine.findRoute('objA', 'objE', { mode: 'walking', accessibleOnly: false });
    
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Routing nodes missing/);
  });

  it('handles blocked connection (vehicle route)', () => {
    const engine = new RoutingEngine(nodes, connections, objects);
    // Hallway c1 is vehicle = false
    const result = engine.findRoute('objA', 'objB', { mode: 'vehicle', accessibleOnly: false });
    
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/No valid route found/);
  });
});
