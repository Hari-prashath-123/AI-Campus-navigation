import { describe, it, expect, beforeEach } from 'vitest';
import { navStore } from '../api/nav.store';

describe('navStore (Unified Node & Connection Storage)', () => {
  beforeEach(() => {
    navStore.reset();
  });

  it('initializes with seed nodes and empty connections', () => {
    const nodes = navStore.getNodes();
    expect(nodes.length).toBeGreaterThan(0);
    const conns = navStore.getConnections();
    expect(Array.isArray(conns)).toBe(true);
  });

  it('creates, updates and deletes a spatial node', () => {
    const newNode = navStore.createNode({
      campusId: 'campus-test',
      floorId: 'floor-test',
      type: 'hallway',
      coordinates: { x: 12.5, y: 18.2 },
      isAccessible: true,
      label: 'Test Waypoint',
    });

    expect(newNode.id).toBeDefined();
    expect(navStore.getNodeById(newNode.id)).toBeDefined();

    const updated = navStore.updateNode(newNode.id, { label: 'Updated Label' });
    expect(updated?.label).toBe('Updated Label');

    const deleted = navStore.deleteNode(newNode.id);
    expect(deleted).toBe(true);
    expect(navStore.getNodeById(newNode.id)).toBeUndefined();
  });

  it('cascades node deletion to connected edges', () => {
    const nodeA = navStore.createNode({
      campusId: 'campus-test',
      type: 'door',
      coordinates: { x: 0, y: 0 },
      isAccessible: true,
    });
    const nodeB = navStore.createNode({
      campusId: 'campus-test',
      type: 'hallway',
      coordinates: { x: 10, y: 0 },
      isAccessible: true,
    });

    const conn = navStore.createConnection({
      campusId: 'campus-test',
      sourceNodeId: nodeA.id,
      targetNodeId: nodeB.id,
      connectionType: 'corridor',
      name: 'Door to Corridor',
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      distanceMeters: 10,
      weightMultiplier: 1.0,
    });

    expect('id' in conn).toBe(true);
    if ('id' in conn) {
      expect(navStore.getConnectionById(conn.id)).toBeDefined();

      // Delete nodeA -> conn should be deleted as cascade
      navStore.deleteNode(nodeA.id);
      expect(navStore.getConnectionById(conn.id)).toBeUndefined();
    }
  });

  it('rejects self-loop connections', () => {
    const node = navStore.createNode({
      campusId: 'campus-test',
      type: 'hallway',
      coordinates: { x: 5, y: 5 },
      isAccessible: true,
    });

    const res = navStore.createConnection({
      campusId: 'campus-test',
      sourceNodeId: node.id,
      targetNodeId: node.id,
      connectionType: 'corridor',
      name: 'Self loop',
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      distanceMeters: 0,
      weightMultiplier: 1.0,
    });

    expect('error' in res).toBe(true);
  });
});
