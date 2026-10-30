import { SpatialNode, CampusConnection } from '../types/connection';
import { MapObject } from '../types/object';

export interface GraphValidationError {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'node' | 'edge' | 'object' | 'transition';
  entityId: string;
  title: string;
  description: string;
  floorId?: string;
  subType?: 'unreachable_room' | 'missing_entrance' | 'disconnected_path' | 'invalid_transition' | 'duplicate_edge' | 'dangling_connection' | 'stale_reference';
}

export interface GraphValidationReport {
  isValid: boolean;
  errors: GraphValidationError[];
  warnings: GraphValidationError[];
  totalNodes: number;
  totalEdges: number;
  totalObjects: number;
  disconnectedNodeCount: number;
  unreachableObjectCount: number;
  duplicateEdgeCount: number;
  danglingEdgeCount: number;
}

/**
 * Finds all nodes with zero connected edges.
 */
export function findDisconnectedNodes(
  nodes: SpatialNode[],
  connections: CampusConnection[]
): SpatialNode[] {
  const connectedNodeIds = new Set<string>();
  for (const c of connections) {
    connectedNodeIds.add(c.sourceNodeId);
    connectedNodeIds.add(c.targetNodeId);
  }
  return nodes.filter(n => !connectedNodeIds.has(n.id));
}

/**
 * Finds all edges where either source or target node does not exist.
 */
export function findDanglingEdges(
  nodes: SpatialNode[],
  connections: CampusConnection[]
): CampusConnection[] {
  const nodeMap = new Set(nodes.map(n => n.id));
  return connections.filter(c => !nodeMap.has(c.sourceNodeId) || !nodeMap.has(c.targetNodeId));
}

/**
 * Finds duplicate connections (e.g. identical pairs connecting the same two nodes).
 */
export function findDuplicateEdges(connections: CampusConnection[]): CampusConnection[] {
  const seen = new Set<string>();
  const duplicates: CampusConnection[] = [];

  for (const c of connections) {
    const key = c.isBidirectional
      ? (c.sourceNodeId < c.targetNodeId ? `${c.sourceNodeId}__${c.targetNodeId}` : `${c.targetNodeId}__${c.sourceNodeId}`)
      : `${c.sourceNodeId}-->${c.targetNodeId}`;

    if (seen.has(key)) {
      duplicates.push(c);
    } else {
      seen.add(key);
    }
  }

  return duplicates;
}

/**
 * Finds objects that don't have an associated navigation node, or whose associated
 * node does not exist in the node graph, or whose node has no edges.
 * Supports multiple entrance nodes (obj.entranceNodeIds).
 */
export function findUnreachableObjects(
  objects: MapObject[],
  nodes: SpatialNode[],
  connections: CampusConnection[]
): { object: MapObject; reason: 'missing_node_ref' | 'node_not_found' | 'node_isolated' }[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const connectedNodeIds = new Set<string>();
  for (const c of connections) {
    connectedNodeIds.add(c.sourceNodeId);
    connectedNodeIds.add(c.targetNodeId);
  }

  const results: { object: MapObject; reason: 'missing_node_ref' | 'node_not_found' | 'node_isolated' }[] = [];

  for (const obj of objects) {
    const entrances = Array.from(new Set([
      obj.associatedNodeId,
      ...(obj.entranceNodeIds || [])
    ])).filter(Boolean);

    if (entrances.length === 0) {
      results.push({ object: obj, reason: 'missing_node_ref' });
      continue;
    }

    const existingEntrances = entrances.filter(id => nodeMap.has(id));
    if (existingEntrances.length === 0) {
      results.push({ object: obj, reason: 'node_not_found' });
      continue;
    }

    const hasConnectedEntrance = existingEntrances.some(id => connectedNodeIds.has(id));
    if (!hasConnectedEntrance) {
      results.push({ object: obj, reason: 'node_isolated' });
    }
  }

  return results;
}

/**
 * Validates floor transition connections (stairs, elevators, ramps, bridges).
 * Checks that inter-floor edges correctly link different floors and have appropriate connector types.
 */
export function validateFloorTransitions(
  connections: CampusConnection[],
  _nodes?: SpatialNode[]
): GraphValidationError[] {
  const issues: GraphValidationError[] = [];

  for (const conn of connections) {
    const isVertical = conn.connectionType === 'staircase' || conn.connectionType === 'elevator';
    const isInterFloor = conn.sourceFloorId && conn.targetFloorId && conn.sourceFloorId !== conn.targetFloorId;

    if (isInterFloor && !isVertical && conn.connectionType !== 'ramp' && conn.connectionType !== 'bridge') {
      issues.push({
        id: `trans_${conn.id}`,
        type: 'warning',
        category: 'transition',
        subType: 'invalid_transition',
        entityId: conn.id,
        title: 'Unexpected Inter-floor Connection Type',
        description: `Connection "${conn.name}" crosses floors (${conn.sourceFloorId} -> ${conn.targetFloorId}) but has type "${conn.connectionType}". Usually stairs, elevators, or ramps should be used.`,
        floorId: conn.sourceFloorId,
      });
    }

    if (isVertical && !isInterFloor && conn.sourceFloorId) {
      issues.push({
        id: `vert_${conn.id}`,
        type: 'info',
        category: 'transition',
        subType: 'invalid_transition',
        entityId: conn.id,
        title: 'Single-floor Vertical Connector',
        description: `Vertical connection "${conn.name}" (${conn.connectionType}) connects nodes on the same floor. Consider linking it to the adjacent floor.`,
        floorId: conn.sourceFloorId,
      });
    }
  }

  return issues;
}

/**
 * Validates the entire campus / floor navigation network.
 */
export function validateCampusGraph(
  nodes: SpatialNode[],
  connections: CampusConnection[],
  objects: MapObject[]
): GraphValidationReport {
  const errors: GraphValidationError[] = [];
  const warnings: GraphValidationError[] = [];

  // 1. Dangling edges
  const dangling = findDanglingEdges(nodes, connections);
  for (const edge of dangling) {
    errors.push({
      id: `dangling_${edge.id}`,
      type: 'error',
      category: 'edge',
      subType: 'dangling_connection',
      entityId: edge.id,
      title: 'Broken Connection Reference',
      description: `Edge "${edge.name}" references a missing source or target node.`,
      floorId: edge.sourceFloorId,
    });
  }

  // 2. Duplicate edges
  const duplicates = findDuplicateEdges(connections);
  for (const edge of duplicates) {
    warnings.push({
      id: `dup_${edge.id}`,
      type: 'warning',
      category: 'edge',
      subType: 'duplicate_edge',
      entityId: edge.id,
      title: 'Duplicate Edge Connection',
      description: `Multiple connections link the same nodes ("${edge.name}").`,
      floorId: edge.sourceFloorId,
    });
  }

  // 3. Disconnected nodes
  const disconnected = findDisconnectedNodes(nodes, connections);
  for (const node of disconnected) {
    warnings.push({
      id: `disc_${node.id}`,
      type: 'warning',
      category: 'node',
      subType: 'disconnected_path',
      entityId: node.id,
      title: 'Disconnected Navigation Node',
      description: `Node ${node.label || node.id} (${node.type}) is not connected to any other node.`,
      floorId: node.floorId,
    });
  }

  // 4. Unreachable objects & missing entrances
  const unreachable = findUnreachableObjects(objects, nodes, connections);
  for (const item of unreachable) {
    const objName = typeof item.object.name === 'string' ? item.object.name : item.object.name.en || item.object.code;
    if (item.reason === 'missing_node_ref') {
      warnings.push({
        id: `unreach_${item.object.id}`,
        type: 'warning',
        category: 'object',
        subType: 'missing_entrance',
        entityId: item.object.id,
        title: 'Missing Room Entrance',
        description: `Room "${objName}" has no entrance door / navigation node associated with it.`,
        floorId: item.object.floorId,
      });
    } else if (item.reason === 'node_not_found') {
      errors.push({
        id: `unreach_${item.object.id}`,
        type: 'error',
        category: 'object',
        subType: 'stale_reference',
        entityId: item.object.id,
        title: 'Missing Node Reference',
        description: `Room "${objName}" references a navigation node that does not exist in the graph.`,
        floorId: item.object.floorId,
      });
    } else if (item.reason === 'node_isolated') {
      warnings.push({
        id: `unreach_${item.object.id}`,
        type: 'warning',
        category: 'object',
        subType: 'unreachable_room',
        entityId: item.object.id,
        title: 'Unreachable Room Entrance',
        description: `Room "${objName}" door is not connected to any walkable corridor path.`,
        floorId: item.object.floorId,
      });
    }
  }

  // 5. Floor transitions
  const transitionIssues = validateFloorTransitions(connections, nodes);
  for (const issue of transitionIssues) {
    if (issue.type === 'error') errors.push(issue);
    else warnings.push(issue);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalNodes: nodes.length,
    totalEdges: connections.length,
    totalObjects: objects.length,
    disconnectedNodeCount: disconnected.length,
    unreachableObjectCount: unreachable.length,
    duplicateEdgeCount: duplicates.length,
    danglingEdgeCount: dangling.length,
  };
}
