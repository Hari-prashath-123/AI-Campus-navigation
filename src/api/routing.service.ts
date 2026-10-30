import { SpatialNode, CampusConnection } from '../types/connection';
import { MapObject } from '../types/object';
import { accessRuleService } from './access-rule.service';

export type RouteMode = 'walking' | 'vehicle';

export interface RoutePreferences {
  mode: RouteMode;
  accessibleOnly: boolean;
  blockedConnectionIds?: string[];
  allowRestricted?: boolean;
}

export interface RouteTransition {
  fromNodeId: string;
  toNodeId: string;
  type: string;
  description: string;
  fromFloorId?: string;
  toFloorId?: string;
}

export interface RouteStep {
  stepIndex: number;
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  turnType: 'straight' | 'left' | 'right' | 'slight_left' | 'slight_right' | 'stairs' | 'elevator' | 'ramp' | 'bridge' | 'depart' | 'arrive';
  floorId?: string;
  buildingId?: string;
  nodeId?: string;
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
  steps?: RouteStep[];
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

    if (!prefs.allowRestricted) {
      const targetAccess = accessRuleService.isTargetAccessible('object', targetObjectId);
      if (!targetAccess.isAccessible && targetAccess.isRoutingBlocked) {
        return {
          success: false,
          nodes: [],
          objects: [sourceObjectId, targetObjectId],
          totalDistanceMeters: 0,
          estimatedTimeSeconds: 0,
          floors: [],
          buildings: [],
          transitions: [],
          message: targetAccess.reason || 'Target object is currently closed or restricted.',
        };
      }
    }

    const sourceEntrances = Array.from(new Set([
      sourceObj.associatedNodeId,
      ...(sourceObj.entranceNodeIds || [])
    ])).filter(id => Boolean(id) && this.nodes.has(id));

    const targetEntrances = new Set(Array.from(new Set([
      targetObj.associatedNodeId,
      ...(targetObj.entranceNodeIds || [])
    ])).filter(id => Boolean(id) && this.nodes.has(id)));

    if (sourceEntrances.length === 0 || targetEntrances.size === 0) {
      return { success: false, nodes: [], objects: [], totalDistanceMeters: 0, estimatedTimeSeconds: 0, floors: [], buildings: [], transitions: [], message: 'Routing nodes missing from graph (objects must have at least one valid entrance node).' };
    }

    // A* Initialization supporting multiple entrances
    const frontier = new PriorityQueue<string>();
    const cameFrom = new Map<string, { node: string, edge: CampusConnection } | null>();
    const costSoFar = new Map<string, number>();

    for (const sNode of sourceEntrances) {
      frontier.enqueue(sNode, 0);
      cameFrom.set(sNode, null);
      costSoFar.set(sNode, 0);
    }

    let reachedTargetNode: string | null = null;

    while (!frontier.isEmpty()) {
      const current = frontier.dequeue()!;

      if (targetEntrances.has(current)) {
        reachedTargetNode = current;
        break;
      }

      const neighbors = this.edges.get(current) || [];
      for (const edge of neighbors) {
        // Preferences filtering
        if (prefs.blockedConnectionIds?.includes(edge.id)) continue;
        if (prefs.accessibleOnly && !edge.isAccessible) continue;
        if (prefs.mode === 'vehicle' && !edge.isVehicleAccessible) continue;
        if (prefs.mode === 'walking' && !edge.isWalkable) continue;
        if (!prefs.allowRestricted && (edge.isRestricted || this.nodes.get(edge.targetNodeId)?.isRestricted)) continue;

        // Dynamic access schedules and temporary closure rules
        if (!prefs.allowRestricted) {
          const edgeAccess = accessRuleService.isTargetAccessible('edge', edge.id);
          if (!edgeAccess.isAccessible && edgeAccess.isRoutingBlocked) continue;

          if (edge.targetFloorId) {
            const floorAccess = accessRuleService.isTargetAccessible('floor', edge.targetFloorId);
            if (!floorAccess.isAccessible && floorAccess.isRoutingBlocked) continue;
          }
        }

        // Dynamic access schedules and temporary closure rules
        if (!prefs.allowRestricted) {
          const edgeAccess = accessRuleService.isTargetAccessible('edge', edge.id);
          if (!edgeAccess.isAccessible && edgeAccess.isRoutingBlocked) continue;

          if (edge.targetFloorId) {
            const floorAccess = accessRuleService.isTargetAccessible('floor', edge.targetFloorId);
            if (!floorAccess.isAccessible && floorAccess.isRoutingBlocked) continue;
          }
        }

        // Custom weights
        const newCost = costSoFar.get(current)! + (edge.distanceMeters * edge.weightMultiplier);
        const nextNode = edge.targetNodeId;
        
        if (!costSoFar.has(nextNode) || newCost < costSoFar.get(nextNode)!) {
          costSoFar.set(nextNode, newCost);
          let minH = Infinity;
          for (const tNode of targetEntrances) {
            const h = this.heuristic(nextNode, tNode);
            if (h < minH) minH = h;
          }
          frontier.enqueue(nextNode, newCost + (minH === Infinity ? 0 : minH));
          cameFrom.set(nextNode, { node: current, edge });
        }
      }
    }

    if (!reachedTargetNode) {
      return { success: false, nodes: [], objects: [], totalDistanceMeters: 0, estimatedTimeSeconds: 0, floors: [], buildings: [], transitions: [], message: 'No valid route found.' };
    }

    // Reconstruct path
    const pathNodes: string[] = [];
    const pathEdges: CampusConnection[] = [];
    let curr: string | null = reachedTargetNode;

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
    const sourceNode = this.nodes.get(pathNodes[0]);
    if (sourceNode?.floorId) floorsSet.add(sourceNode.floorId);
    if (sourceNode?.buildingId) buildingsSet.add(sourceNode.buildingId);

    for (const edge of pathEdges) {
      totalDist += edge.distanceMeters;
      
      if (edge.targetFloorId) floorsSet.add(edge.targetFloorId);
      if (edge.targetBuildingId) buildingsSet.add(edge.targetBuildingId);

      // Identify transitions (floor or building change, or specific types like stairs/elevators/ramps/bridges)
      if (edge.connectionType !== 'corridor' && edge.connectionType !== 'door') {
         let desc = `Use ${edge.connectionType}`;
         if (edge.connectionType === 'staircase') desc = `Take the stairs`;
         if (edge.connectionType === 'elevator') desc = `Take the elevator`;
         if (edge.connectionType === 'ramp') desc = `Use the accessible ramp`;
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
           description: desc,
           fromFloorId: edge.sourceFloorId,
           toFloorId: edge.targetFloorId,
         });
      }
    }

    // Basic time estimate: 1.4 m/s walking, 5 m/s vehicle
    const speed = prefs.mode === 'vehicle' ? 5 : 1.4;
    const estimatedTimeSeconds = totalDist / speed;

    const startName = sourceObj ? (typeof sourceObj.name === 'string' ? sourceObj.name : sourceObj.name.en) : undefined;
    const destName = targetObj ? (typeof targetObj.name === 'string' ? targetObj.name : targetObj.name.en) : undefined;
    const steps = this.generateSteps(pathNodes, pathEdges, startName, destName, speed);

    return {
      success: true,
      nodes: pathNodes,
      objects: [sourceObjectId, targetObjectId],
      totalDistanceMeters: totalDist,
      estimatedTimeSeconds,
      floors: Array.from(floorsSet),
      buildings: Array.from(buildingsSet),
      transitions,
      steps,
    };
  }

  public findRouteBetweenNodes(startNode: string, endNode: string, prefs: RoutePreferences): RouteResult {
    if (!this.nodes.has(startNode) || !this.nodes.has(endNode)) {
      return { success: false, nodes: [], objects: [], totalDistanceMeters: 0, estimatedTimeSeconds: 0, floors: [], buildings: [], transitions: [], message: 'Start or end node not found in graph.' };
    }

    const frontier = new PriorityQueue<string>();
    frontier.enqueue(startNode, 0);

    const cameFrom = new Map<string, { node: string; edge: CampusConnection } | null>();
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
        if (prefs.blockedConnectionIds?.includes(edge.id)) continue;
        if (prefs.accessibleOnly && !edge.isAccessible) continue;
        if (prefs.mode === 'vehicle' && !edge.isVehicleAccessible) continue;
        if (prefs.mode === 'walking' && !edge.isWalkable) continue;
        if (!prefs.allowRestricted && (edge.isRestricted || this.nodes.get(edge.targetNodeId)?.isRestricted)) continue;

        // Dynamic access schedules and temporary closure rules
        if (!prefs.allowRestricted) {
          const edgeAccess = accessRuleService.isTargetAccessible('edge', edge.id);
          if (!edgeAccess.isAccessible && edgeAccess.isRoutingBlocked) continue;

          if (edge.targetFloorId) {
            const floorAccess = accessRuleService.isTargetAccessible('floor', edge.targetFloorId);
            if (!floorAccess.isAccessible && floorAccess.isRoutingBlocked) continue;
          }
        }

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
      return { success: false, nodes: [], objects: [], totalDistanceMeters: 0, estimatedTimeSeconds: 0, floors: [], buildings: [], transitions: [], message: 'No valid route found between nodes.' };
    }

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

    let totalDist = 0;
    const floorsSet = new Set<string>();
    const buildingsSet = new Set<string>();
    const transitions: RouteTransition[] = [];

    const sourceNode = this.nodes.get(startNode);
    if (sourceNode?.floorId) floorsSet.add(sourceNode.floorId);
    if (sourceNode?.buildingId) buildingsSet.add(sourceNode.buildingId);

    for (const edge of pathEdges) {
      totalDist += edge.distanceMeters;
      if (edge.targetFloorId) floorsSet.add(edge.targetFloorId);
      if (edge.targetBuildingId) buildingsSet.add(edge.targetBuildingId);

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
          description: desc,
          fromFloorId: edge.sourceFloorId,
          toFloorId: edge.targetFloorId,
        });
      }
    }

    const speed = prefs.mode === 'vehicle' ? 5 : 1.4;
    const estimatedTimeSeconds = totalDist / speed;
    const startNodeObj = this.nodes.get(startNode);
    const endNodeObj = this.nodes.get(endNode);
    const steps = this.generateSteps(pathNodes, pathEdges, startNodeObj?.label, endNodeObj?.label, speed);

    return {
      success: true,
      nodes: pathNodes,
      objects: [],
      totalDistanceMeters: totalDist,
      estimatedTimeSeconds,
      floors: Array.from(floorsSet),
      buildings: Array.from(buildingsSet),
      transitions,
      steps,
    };
  }

  private generateSteps(
    pathNodes: string[],
    pathEdges: CampusConnection[],
    startName?: string,
    destName?: string,
    speed = 1.4
  ): RouteStep[] {
    const steps: RouteStep[] = [];
    if (pathNodes.length === 0) return steps;

    const firstNode = this.nodes.get(pathNodes[0]);
    steps.push({
      stepIndex: 1,
      instruction: startName ? `Start at ${startName}` : `Depart from ${firstNode?.label || 'starting point'}`,
      distanceMeters: 0,
      durationSeconds: 0,
      turnType: 'depart',
      floorId: firstNode?.floorId,
      buildingId: firstNode?.buildingId,
      nodeId: firstNode?.id,
    });

    let prevVec: { x: number; y: number } | null = null;

    for (let i = 0; i < pathEdges.length; i++) {
      const edge = pathEdges[i];
      const src = this.nodes.get(edge.sourceNodeId);
      const tgt = this.nodes.get(edge.targetNodeId);
      const durationSeconds = Math.round(edge.distanceMeters / speed);

      let turnType: RouteStep['turnType'] = 'straight';
      let instruction = '';

      if (edge.connectionType === 'elevator') {
        turnType = 'elevator';
        instruction = `Take the elevator to ${edge.targetFloorId || 'destination floor'}`;
        prevVec = null;
      } else if (edge.connectionType === 'staircase') {
        turnType = 'stairs';
        instruction = `Take the stairs to ${edge.targetFloorId || 'destination floor'}`;
        prevVec = null;
      } else if (edge.connectionType === 'ramp') {
        turnType = 'ramp';
        instruction = `Use the accessible ramp`;
        prevVec = null;
      } else if (edge.connectionType === 'bridge') {
        turnType = 'bridge';
        instruction = `Cross the skybridge link`;
        prevVec = null;
      } else if (edge.connectionType === 'door') {
        turnType = 'straight';
        instruction = tgt?.label ? `Pass through ${tgt.label}` : `Pass through entrance door (${edge.distanceMeters} m)`;
      } else {
        // Corridor
        if (src && tgt) {
          const curVec = { x: tgt.coordinates.x - src.coordinates.x, y: tgt.coordinates.y - src.coordinates.y };
          if (prevVec && (prevVec.x !== 0 || prevVec.y !== 0) && (curVec.x !== 0 || curVec.y !== 0)) {
            const angle1 = Math.atan2(prevVec.y, prevVec.x);
            const angle2 = Math.atan2(curVec.y, curVec.x);
            let diff = angle2 - angle1;
            while (diff > Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;

            if (diff > 0.4) {
              turnType = diff > 1.2 ? 'right' : 'slight_right';
              instruction = `Turn right along corridor (${edge.distanceMeters} m)`;
            } else if (diff < -0.4) {
              turnType = diff < -1.2 ? 'left' : 'slight_left';
              instruction = `Turn left along corridor (${edge.distanceMeters} m)`;
            } else {
              turnType = 'straight';
              instruction = `Continue straight down ${edge.name || 'corridor'} (${edge.distanceMeters} m)`;
            }
          } else {
            instruction = `Walk down ${edge.name || 'corridor'} (${edge.distanceMeters} m)`;
          }
          prevVec = curVec;
        } else {
          instruction = `Walk along ${edge.name || 'corridor'} (${edge.distanceMeters} m)`;
        }
      }

      steps.push({
        stepIndex: steps.length + 1,
        instruction,
        distanceMeters: edge.distanceMeters,
        durationSeconds,
        turnType,
        floorId: edge.targetFloorId || edge.sourceFloorId,
        buildingId: edge.targetBuildingId || edge.sourceBuildingId,
        nodeId: edge.targetNodeId,
      });
    }

    const lastNode = this.nodes.get(pathNodes[pathNodes.length - 1]);
    steps.push({
      stepIndex: steps.length + 1,
      instruction: destName ? `Arrive at ${destName}` : `Arrive at ${lastNode?.label || 'destination'}`,
      distanceMeters: 0,
      durationSeconds: 0,
      turnType: 'arrive',
      floorId: lastNode?.floorId,
      buildingId: lastNode?.buildingId,
      nodeId: lastNode?.id,
    });

    return steps;
  }
}

// Authoritative routing service bridging navStore and objectStore
export const routingService = {
  calculateRoute: async (
    campusId: string,
    source: string,
    target: string,
    options?: { accessibleOnly?: boolean; mode?: 'walking' | 'vehicle'; blockedConnectionIds?: string[]; allowRestricted?: boolean }
  ): Promise<{ success: boolean; data: RouteResult }> => {
    // Dynamic import to avoid circular dependency issues at import time
    const { navStore } = await import('./nav.store');
    const { objectStore } = await import('./object.store');

    const nodes = navStore.getNodesByCampus(campusId);
    const connections = navStore.getConnectionsByCampus(campusId);
    const objects = objectStore.getByCampus(campusId);

    const engine = new RoutingEngine(nodes, connections, objects);
    const prefs: RoutePreferences = {
      mode: options?.mode || 'walking',
      accessibleOnly: options?.accessibleOnly ?? false,
      blockedConnectionIds: options?.blockedConnectionIds,
      allowRestricted: options?.allowRestricted ?? false,
    };

    const sourceObj = objects.find(o => o.id === source);
    const targetObj = objects.find(o => o.id === target);

    let result: RouteResult;
    if (sourceObj && targetObj) {
      result = engine.findRoute(source, target, prefs);
    } else {
      // Direct node IDs or mix of node and object
      const startNodeId = sourceObj ? sourceObj.associatedNodeId : source;
      const endNodeId = targetObj ? targetObj.associatedNodeId : target;
      result = engine.findRouteBetweenNodes(startNodeId, endNodeId, prefs);
      if (sourceObj || targetObj) {
        result.objects = [sourceObj?.id || '', targetObj?.id || ''].filter(Boolean);
      }
    }

    return { success: result.success, data: result };
  }
};
