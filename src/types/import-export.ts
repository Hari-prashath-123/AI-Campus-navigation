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
  objectTypeId?: string;
  geometry?: any;
  geometryType?: string;
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
  name?: string;
  description?: string;
  availability?: string;
  isRestricted?: boolean;
  requiredPermissions?: string[];
  accessRules?: {
    allowedUserTypes?: string[];
    restrictedTimeRanges?: string[];
    requiresPermission?: boolean;
  };
  metadata?: Record<string, any>;
}

export interface ImportPreviewDiff {
  campus: {
    action: 'create_new_site' | 'merge_into_existing';
    name: string;
    code: string;
    slug: string;
    targetCampusId?: string;
  };
  buildings: { code: string; name: string; floorCount: number }[];
  floorsCount: number;
  objectsCount: number;
  nodesCount: number;
  connectionsCount: number;
  accessRulesCount: number;
  objectTypesCount: number;
  customObjectTypes: string[];
  potentialCollisions: string[];
}

export interface ImportPreviewResult {
  valid: boolean;
  issues: ValidationIssue[];
  preview?: ImportPreviewDiff;
  bundle?: CampusBundle;
  stats?: ValidationResult['stats'];
}

export interface ImportCampusOptions {
  targetOrganizationId?: string;
  targetCampusId?: string;
  newCampusSlug?: string;
  newCampusName?: Record<string, string>;
  newCampusCode?: string;
  importMode?: 'create_new_site' | 'merge_into_existing' | 'overwrite_existing';
}

export interface ImportCampusResult {
  success: boolean;
  campusId: string;
  message?: string;
  stats: {
    buildings: number;
    floors: number;
    objectTypes: number;
    objects: number;
    nodes: number;
    connections: number;
    accessRules: number;
  };
}

/**
 * A saved map-editor canvas.  The editor persists these separately from the
 * campus records, so they need to travel with a portable campus export.
 */
export interface ExportedMapLayout {
  storageKey: string;
  shapes: any[];
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
  mapLayouts?: ExportedMapLayout[];
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
