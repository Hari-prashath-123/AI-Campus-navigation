import { SpatialNode, CampusConnection } from '../types/connection';
import { MapObject } from '../types/object';

export type RouteMode = 'walking' | 'vehicle';

export interface RoutePreferences {
  mode: RouteMode;
  accessibleOnly: boolean;
  blockedConnectionIds?: string[];
}

export interface RouteTransition {
  fromNodeId: string;
  toNodeId: string;
  type: string;
  description: string;
}

export interface RouteResult {
  success: boolean;
  nodes: string[];
  objects: string[];
  totalDistanceMeters: number;
  estimatedTimeSeconds: number;
  floors: string[];
  buildings: string[];
  transitions: RouteTransition[];
  message?: string;
}

// Simple priority queue for A*
class PriorityQueue<T> {
  private items: { element: T; priority: number }[] = [];
  
  enqueue(element: T, priority: number) {
    this.items.push({ element, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }
  
  dequeue(): T | undefined {
    return this.items.shift()?.element;
  }
  
  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export class RoutingEngine {
  private nodes: Map<string, SpatialNode> = new Map();
  private edges: Map<string, CampusConnection[]> = new Map(); // adjacency list (nodeId -> outgoing edges)
  private objects: Map<string, MapObject> = new Map();

  constructor(
    nodesList: SpatialNode[],
    connectionsList: CampusConnection[],
    objectsList: MapObject[]
  ) {
    // Index nodes
    for (const node of nodesList) {
      this.nodes.set(node.id, node);
      this.edges.set(node.id, []);
    }

    // Index objects
    for (const obj of objectsList) {
      this.objects.set(obj.id, obj);
    }

    // Index edges
    for (const conn of connectionsList) {
      // Must ensure nodes exist to be part of the graph
      if (!this.nodes.has(conn.sourceNodeId)) {
        // If node doesn't exist, we might dynamically add it, but for strictness, skip
        // In a real app, node lists should be complete.
        continue;
      }
      
      const outgoing = this.edges.get(conn.sourceNodeId);
      if (outgoing) outgoing.push(conn);

      if (conn.isBidirectional && this.nodes.has(conn.targetNodeId)) {
        const incoming = this.edges.get(conn.targetNodeId);
        if (incoming) {
          incoming.push({
            ...conn,
            sourceNodeId: conn.targetNodeId,
            targetNodeId: conn.sourceNodeId,
            sourceBuildingId: conn.targetBuildingId,
            sourceFloorId: conn.targetFloorId,
            targetBuildingId: conn.sourceBuildingId,
            targetFloorId: conn.sourceFloorId
          });
        }
      }
    }
  }

  // Heuristic: Straight-line distance if on same floor, otherwise add floor penalty
  private heuristic(aId: string, bId: string): number {
    const a = this.nodes.get(aId);
    const b = this.nodes.get(bId);
    if (!a || !b) return 0;

    let dist = 0;
    if (a.coordinates && b.coordinates) {
      const dx = a.coordinates.x - b.coordinates.x;
      const dy = a.coordinates.y - b.coordinates.y;
      dist = Math.sqrt(dx * dx + dy * dy); // roughly in meters if coords are meters
    }

    if (a.floorId !== b.floorId) dist += 10;
    if (a.buildingId !== b.buildingId) dist += 50;

    return dist;
  }

  public findRoute(sourceObjectId: string, targetObjectId: string, prefs: RoutePreferences): RouteResult {
    const sourceObj = this.objects.get(sourceObjectId);
    const targetObj = this.objects.get(targetObjectId);

    if (!sourceObj || !targetObj) {
      return { success: false, nodes: [], objects: [], totalDistanceMeters: 0, estimatedTimeSeconds: 0, floors: [], buildings: [], transitions: [], message: 'Source or target object not found.' };
    }

    if (!sourceObj.associatedNodeId || !targetObj.associatedNodeId) {
      return { success: false, nodes: [], objects: [], totalDistanceMeters: 0, estimatedTimeSeconds: 0, floors: [], buildings: [], transitions: [], message: 'Objects must have associated routing nodes.' };
    }

    const startNode = sourceObj.associatedNodeId;
    const endNode = targetObj.associatedNodeId;

    if (!this.nodes.has(startNode) || !this.nodes.has(endNode)) {
       return { success: false, nodes: [], objects: [], totalDistanceMeters: 0, estimatedTimeSeconds: 0, floors: [], buildings: [], transitions: [], message: 'Routing nodes missing from graph.' };
    }

    // A* Initialization
    const frontier = new PriorityQueue<string>();
    frontier.enqueue(startNode, 0);

    const cameFrom = new Map<string, { node: string, edge: CampusConnection } | null>();
    const costSoFar = new Map<string, number>();

    cameFrom.set(startNode, null);
    costSoFar.set(startNode, 0);

    let found = false;

    while (!frontier.isEmpty()) {
      const current = frontier.dequeue()!;

      if (current === endNode) {
        found = true;
        break;
      }

      const neighbors = this.edges.get(current) || [];
      for (const edge of neighbors) {
        // Preferences filtering
        if (prefs.blockedConnectionIds?.includes(edge.id)) continue;
        if (prefs.accessibleOnly && !edge.isAccessible) continue;
        if (prefs.mode === 'vehicle' && !edge.isVehicleAccessible) continue;
        if (prefs.mode === 'walking' && !edge.isWalkable) continue;

        // Custom weights
        const newCost = costSoFar.get(current)! + (edge.distanceMeters * edge.weightMultiplier);

        const nextNode = edge.targetNodeId;
        
        if (!costSoFar.has(nextNode) || newCost < costSoFar.get(nextNode)!) {
          costSoFar.set(nextNode, newCost);
          const priority = newCost + this.heuristic(nextNode, endNode);
          frontier.enqueue(nextNode, priority);
          cameFrom.set(nextNode, { node: current, edge });
        }
      }
    }

    if (!found) {
      return { success: false, nodes: [], objects: [], totalDistanceMeters: 0, estimatedTimeSeconds: 0, floors: [], buildings: [], transitions: [], message: 'No valid route found.' };
    }

    // Reconstruct path
    const pathNodes: string[] = [];
    const pathEdges: CampusConnection[] = [];
    let curr: string | null = endNode;

    while (curr !== null) {
      pathNodes.push(curr);
      const prev = cameFrom.get(curr);
      if (prev && prev.node !== null) {
        pathEdges.push(prev.edge);
        curr = prev.node;
      } else {
        curr = null;
      }
    }
    
    pathNodes.reverse();
    pathEdges.reverse();

    // Compute stats & metadata
    let totalDist = 0;
    const floorsSet = new Set<string>();
    const buildingsSet = new Set<string>();
    const transitions: RouteTransition[] = [];

    // Add source building/floor
    const sourceNode = this.nodes.get(startNode);
    if (sourceNode?.floorId) floorsSet.add(sourceNode.floorId);
    if (sourceNode?.buildingId) buildingsSet.add(sourceNode.buildingId);

    for (const edge of pathEdges) {
      totalDist += edge.distanceMeters;
      
      if (edge.targetFloorId) floorsSet.add(edge.targetFloorId);
      if (edge.targetBuildingId) buildingsSet.add(edge.targetBuildingId);

      // Identify transitions (floor or building change, or specific types like stairs/elevators)
      if (edge.connectionType !== 'corridor' && edge.connectionType !== 'door') {
         let desc = `Use ${edge.connectionType}`;
         if (edge.connectionType === 'staircase') desc = `Take the stairs`;
         if (edge.connectionType === 'elevator') desc = `Take the elevator`;
         if (edge.connectionType === 'bridge') desc = `Cross the bridge`;
         if (edge.targetFloorId && edge.sourceFloorId !== edge.targetFloorId) {
             desc += ` to another floor`;
         } else if (edge.targetBuildingId && edge.sourceBuildingId !== edge.targetBuildingId) {
             desc += ` to another building`;
         }
         
         transitions.push({
           fromNodeId: edge.sourceNodeId,
           toNodeId: edge.targetNodeId,
           type: edge.connectionType,
           description: desc
         });
      }
    }

    // Basic time estimate: 1.4 m/s walking, 5 m/s vehicle
    const speed = prefs.mode === 'vehicle' ? 5 : 1.4;
    const estimatedTimeSeconds = totalDist / speed;

    return {
      success: true,
      nodes: pathNodes,
      objects: [sourceObjectId, targetObjectId],
      totalDistanceMeters: totalDist,
      estimatedTimeSeconds,
      floors: Array.from(floorsSet),
      buildings: Array.from(buildingsSet),
      transitions
    };
  }
}

// Stub for ai.service.ts compatibility
export const routingService = {
  calculateRoute: async (_campusId: string, _source: string, _target: string, _options?: { accessibleOnly?: boolean; mode?: 'walking' | 'vehicle'; blockedConnectionIds?: string[] }): Promise<{ success: boolean; data: any }> => {
    return { success: true, data: { nodes: [], message: 'Mock route' } };
  }
};
