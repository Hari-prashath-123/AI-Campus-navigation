import { describe, it, expect } from 'vitest';
import {
  findDisconnectedNodes,
  findDanglingEdges,
  findUnreachableObjects,
  validateFloorTransitions,
  validateCampusGraph
} from '../utils/graph-validation';
import { SpatialNode, CampusConnection } from '../types/connection';
import { MapObject } from '../types/object';

describe('Graph Validation Utilities', () => {
  const sampleNodes: SpatialNode[] = [
    { id: 'node-1', campusId: 'c1', floorId: 'f1', type: 'door', coordinates: { x: 10, y: 10 }, isAccessible: true },
    { id: 'node-2', campusId: 'c1', floorId: 'f1', type: 'hallway', coordinates: { x: 20, y: 10 }, isAccessible: true },
    { id: 'node-3', campusId: 'c1', floorId: 'f1', type: 'stairs', coordinates: { x: 30, y: 10 }, isAccessible: false },
    { id: 'node-orphan', campusId: 'c1', floorId: 'f1', type: 'hallway', coordinates: { x: 50, y: 50 }, isAccessible: true },
    { id: 'node-f2', campusId: 'c1', floorId: 'f2', type: 'stairs', coordinates: { x: 30, y: 10 }, isAccessible: false },
  ];

  const sampleConnections: CampusConnection[] = [
    {
      id: 'conn-1',
      campusId: 'c1',
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      sourceFloorId: 'f1',
      targetFloorId: 'f1',
      connectionType: 'corridor',
      name: 'Hallway 1',
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      distanceMeters: 10,
      weightMultiplier: 1.0,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'conn-2',
      campusId: 'c1',
      sourceNodeId: 'node-2',
      targetNodeId: 'node-3',
      sourceFloorId: 'f1',
      targetFloorId: 'f1',
      connectionType: 'corridor',
      name: 'Hallway 2',
      isBidirectional: true,
      isAccessible: true,
      isWalkable: true,
      isVehicleAccessible: false,
      distanceMeters: 10,
      weightMultiplier: 1.0,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'conn-vertical',
      campusId: 'c1',
      sourceNodeId: 'node-3',
      targetNodeId: 'node-f2',
      sourceFloorId: 'f1',
      targetFloorId: 'f2',
      connectionType: 'staircase',
      name: 'Stairs F1-F2',
      isBidirectional: true,
      isAccessible: false,
      isWalkable: true,
      isVehicleAccessible: false,
      distanceMeters: 5,
      weightMultiplier: 2.0,
      createdAt: '',
      updatedAt: '',
    },
  ];

  const sampleObjects: MapObject[] = [
    {
      id: 'obj-1',
      campusId: 'c1',
      buildingId: 'b1',
      floorId: 'f1',
      code: 'R101',
      name: { en: 'Room 101' },
      category: 'room',
      coordinates: { x: 10, y: 10 },
      associatedNodeId: 'node-1',
      isAccessible: true,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'obj-orphan',
      campusId: 'c1',
      buildingId: 'b1',
      floorId: 'f1',
      code: 'R102',
      name: { en: 'Room 102' },
      category: 'room',
      coordinates: { x: 50, y: 50 },
      associatedNodeId: 'node-orphan',
      isAccessible: true,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'obj-broken',
      campusId: 'c1',
      buildingId: 'b1',
      floorId: 'f1',
      code: 'R103',
      name: { en: 'Room 103' },
      category: 'room',
      coordinates: { x: 70, y: 70 },
      associatedNodeId: 'non-existent-node',
      isAccessible: true,
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('detects disconnected nodes', () => {
    const disconnected = findDisconnectedNodes(sampleNodes, sampleConnections);
    expect(disconnected.length).toBe(1);
    expect(disconnected[0].id).toBe('node-orphan');
  });

  it('detects dangling edges', () => {
    const badConnections = [
      ...sampleConnections,
      {
        id: 'conn-broken',
        campusId: 'c1',
        sourceNodeId: 'node-1',
        targetNodeId: 'missing-target',
        connectionType: 'corridor' as const,
        name: 'Broken Edge',
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
    const dangling = findDanglingEdges(sampleNodes, badConnections);
    expect(dangling.length).toBe(1);
    expect(dangling[0].id).toBe('conn-broken');
  });

  it('detects unreachable and broken object associations', () => {
    const unreachable = findUnreachableObjects(sampleObjects, sampleNodes, sampleConnections);
    expect(unreachable.length).toBe(2);

    const isolated = unreachable.find(u => u.reason === 'node_isolated');
    expect(isolated?.object.id).toBe('obj-orphan');

    const missing = unreachable.find(u => u.reason === 'node_not_found');
    expect(missing?.object.id).toBe('obj-broken');
  });

  it('validates floor transitions', () => {
    const issues = validateFloorTransitions(sampleConnections);
    // Staircase between f1 and f2 is valid, so no invalid transition warnings
    expect(issues.filter(i => i.type === 'error').length).toBe(0);
  });

  it('produces full validation report with errors and warnings', () => {
    const report = validateCampusGraph(sampleNodes, sampleConnections, sampleObjects);
    expect(report.totalNodes).toBe(5);
    expect(report.totalEdges).toBe(3);
    expect(report.disconnectedNodeCount).toBe(1);
    expect(report.errors.length).toBe(1); // obj-broken missing node reference
    expect(report.warnings.length).toBeGreaterThan(0);
    expect(report.isValid).toBe(false);
  });
});
