import { SpatialEdge, SpatialNode } from './connection';
import { LocalizedString } from './multilingual';

/**
 * Deterministic Routing Types
 */

export interface PathfindingOptions {
  accessibleOnly?: boolean;
  preferElevators?: boolean;
  maxStairFlights?: number;
  avoidOutdoors?: boolean;
}

export type NavigationAction =
  | 'start'
  | 'walk_straight'
  | 'turn_left'
  | 'turn_right'
  | 'slight_left'
  | 'slight_right'
  | 'take_stairs_up'
  | 'take_stairs_down'
  | 'take_elevator'
  | 'enter_building'
  | 'exit_building'
  | 'arrive';

export interface NavigationStep {
  stepIndex: number;
  action: NavigationAction;
  instruction: LocalizedString;
  distanceMeters: number;
  fromNodeId: string;
  toNodeId: string;
  floorId?: string;
  buildingId?: string;
}

export interface FloorTransitionInfo {
  fromFloorId: string;
  toFloorId: string;
  buildingId: string;
  viaType: 'stairs' | 'elevator';
  atNodeId: string;
}

export interface RouteResult {
  routeId: string;
  campusId: string;
  sourceObjectId?: string;
  targetObjectId?: string;
  totalDistanceMeters: number;
  estimatedTimeSeconds: number;
  isAccessible: boolean;
  pathNodes: SpatialNode[];
  pathEdges: SpatialEdge[];
  steps: NavigationStep[];
  floorTransitions: FloorTransitionInfo[];
  calculatedAt: string;
}
