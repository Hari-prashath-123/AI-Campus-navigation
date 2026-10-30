/**
 * Campus Export/Import Types
 *
 * Schema version: 1
 *
 * A CampusBundle is the canonical portable representation of a complete campus.
 * It is safe to export to another instance — it contains NO credentials or auth data.
 */

export const CAMPUS_BUNDLE_SCHEMA_VERSION = 1;

export interface CampusBundleMetadata {
  schemaVersion: number;
  exportedAt: string;          // ISO 8601
  exportedBy?: string;         // Optional display name, never auth token
  platformVersion?: string;
  description?: string;
}

/** Every exportable entity carries its own campusId for cross-reference validation */
export interface ExportedCampus {
  id: string;
  organizationId?: string;
  slug: string;
  code: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  center?: { lat: number; lng: number };
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ExportedBuilding {
  id: string;
  campusId: string;
  code: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  totalFloors: number;
  entranceNodeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportedFloor {
  id: string;
  buildingId: string;
  campusId: string;
  level: number;
  code: string;
  name: Record<string, string>;
  dimensions?: { widthMeters: number; heightMeters: number };
  createdAt: string;
  updatedAt: string;
}

export interface ExportedObjectType {
  id: string;
  name: string;
  category: string;
  iconName: string;
  color: string;
  isWalkable: boolean;
  propertyDefinitions: any[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportedObject {
  id: string;
  campusId: string;
  buildingId: string;
  floorId: string;
  code: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  category: string;
  coordinates: { x: number; y: number };
  associatedNodeId: string;
  entranceNodeIds?: string[];
  isAccessible: boolean;
  parentObjectId?: string;
  subZoneType?: string;
  status?: string;
  tags?: string[];
  images?: string[];
  historicalInfo?: Record<string, string>;
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
    personName?: string;
  };
  externalLinks?: { title: string; url: string }[];
  accessSchedule?: any;
  properties?: Record<string, unknown>;
  attributes?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ExportedNode {
  id: string;
  campusId: string;
  buildingId: string;
  floorId: string;
  type: string;
  coordinates: { x: number; y: number };
  isAccessible: boolean;
  label?: string;
}

export interface ExportedConnection {
  id: string;
  campusId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceFloorId: string;
  targetFloorId: string;
  sourceBuildingId: string;
  targetBuildingId: string;
  connectionType: string;
  distanceMeters: number;
  weightMultiplier: number;
  isWalkable: boolean;
  isVehicleAccessible: boolean;
  isAccessible: boolean;
  isBidirectional: boolean;
  accessRules?: {
    allowedUserTypes?: string[];
    restrictedTimeRanges?: string[];
    requiresPermission?: boolean;
  };
  metadata?: Record<string, any>;
}

/** Full portable campus bundle */
export interface CampusBundle {
  _meta: CampusBundleMetadata;
  campus: ExportedCampus;
  buildings: ExportedBuilding[];
  floors: ExportedFloor[];
  objectTypes: ExportedObjectType[];
  objects: ExportedObject[];
  nodes: ExportedNode[];
  connections: ExportedConnection[];
  accessRules?: any[];
}

// ─── Validation Result ────────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  path?: string; // e.g. "objects[3].id"
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    buildings: number;
    floors: number;
    objects: number;
    connections: number;
    objectTypes: number;
    nodes: number;
  };
}
