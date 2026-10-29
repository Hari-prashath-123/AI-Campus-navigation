import { describe, it, expect, beforeEach } from 'vitest';
import { navStore } from '../api/nav.store';
import { objectStore } from '../api/object.store';
import { routingService } from '../api/routing.service';

describe('Routing Service Integration', () => {
  beforeEach(() => {
    navStore.reset();
    objectStore.reset();
  });

  it('calculates valid route between objects using navStore nodes & edges', async () => {
    const campusId = 'campus-test-integration';

    // 1. Create nodes in navStore
    const doorA = navStore.createNode({
      campusId,
      floorId: 'floor-1',
      type: 'door',
      coordinates: { x: 10, y: 10 },
      isAccessible: true,
      label: 'Lab Door',
    });

    const hall = navStore.createNode({
      campusId,
      floorId: 'floor-1',
      type: 'hallway',
      coordinates: { x: 20, y: 10 },
      isAccessible: true,
      label: 'Main Corridor',
    });

    const doorB = navStore.createNode({
      campusId,
      floorId: 'floor-1',
      type: 'door',
      coordinates: { x: 30, y: 10 },
      isAccessible: true,
      label: 'Library Door',
    });

    // 2. Connect with edges
    navStore.createConnection({
      campusId,
      sourceNodeId: doorA.id,
      targetNodeId: hall.id,
      connectionType: 'corridor',
      name: 'Lab to Hall',
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      distanceMeters: 10,
      weightMultiplier: 1.0,
    });

    navStore.createConnection({
      campusId,
      sourceNodeId: hall.id,
      targetNodeId: doorB.id,
      connectionType: 'corridor',
      name: 'Hall to Library',
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      distanceMeters: 10,
      weightMultiplier: 1.0,
    });

    // 3. Create objects in objectStore associated with these doors
    const labObj = objectStore.create({
      campusId,
      floorId: 'floor-1',
      code: 'LAB-101',
      name: { en: 'AI Research Lab' },
      category: 'room',
      coordinates: { x: 10, y: 10 },
      associatedNodeId: doorA.id,
      isAccessible: true,
    });

    const libObj = objectStore.create({
      campusId,
      floorId: 'floor-1',
      code: 'LIB-102',
      name: { en: 'Study Library' },
      category: 'room',
      coordinates: { x: 30, y: 10 },
      associatedNodeId: doorB.id,
      isAccessible: true,
    });

    // 4. Calculate route
    const res = await routingService.calculateRoute(campusId, labObj.id, libObj.id);

    expect(res.success).toBe(true);
    expect(res.data.nodes).toEqual([doorA.id, hall.id, doorB.id]);
    expect(res.data.totalDistanceMeters).toBe(20);
    expect(res.data.estimatedTimeSeconds).toBeGreaterThan(0);
  });
});
