import { GeoPoint, Point2D } from './common';

/**
 * Connections & Routing Nodes
 */

export type SpatialNodeType = 'hallway' | 'door' | 'stairs' | 'elevator' | 'outdoor_waypoint' | 'entrance' | 'ramp' | 'bridge';

export interface SpatialNode {
  id: string;
  campusId: string;
  buildingId?: string;
  floorId?: string;
  type: SpatialNodeType;
  coordinates: Point2D;
  geoCoordinates?: GeoPoint;
  isAccessible: boolean;
  label?: string;
  isRestricted?: boolean;
  requiredPermissions?: string[];
  associatedObjectId?: string;
}

export type ConnectionType = 
  | 'staircase'
  | 'elevator'
  | 'ramp'
  | 'bridge'
  | 'door'
  | 'entrance'
  | 'corridor'
  | 'building_to_building';

export interface CampusConnection {
  id: string;
  campusId: string;
  
  // Source
  sourceNodeId: string;
  sourceBuildingId?: string;
  sourceFloorId?: string;
  
  // Target
  targetNodeId: string;
  targetBuildingId?: string;
  targetFloorId?: string;

  // Metadata
  connectionType: ConnectionType;
  name: string;
  description?: string;
  
  // Routing Properties
  isBidirectional: boolean;
  isAccessible: boolean;
  isWalkable: boolean;
  isVehicleAccessible: boolean;
  isRestricted?: boolean;
  requiredPermissions?: string[];
  
  // Costs & Constraints
  distanceMeters: number;
  weightMultiplier: number; // e.g. 1.0 for normal, 2.0 for stairs, high for slow paths
  availability?: string; // e.g., "08:00-18:00" or empty for always

  createdAt: string;
  updatedAt: string;
}

// Keeping these for backwards compatibility if needed, but CampusConnection is the new generalized model.
export type ConnectionEdgeType = 'walkway' | 'stairs' | 'elevator' | 'outdoor_path' | 'ramp';

export interface SpatialEdge {
  id: string;
  campusId: string;
  sourceNodeId: string;
  targetNodeId: string;
  distanceMeters: number;
  weightMultiplier: number;
  isAccessible: boolean;
  isBidirectional: boolean;
  edgeType: ConnectionEdgeType;
}
