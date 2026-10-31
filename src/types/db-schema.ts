import type { LocalizedString } from './multilingual';

/**
 * Database-aligned TypeScript interfaces
 * These mirror the PostgreSQL schema exactly for use in services and API layers.
 * LocalizedString is imported from multilingual.ts (not re-exported here).
 */

// ---- Enums (mirror PostgreSQL ENUM types) ----

export type DBObjectCategory =
  | 'room'
  | 'amenity'
  | 'transit'
  | 'entrance'
  | 'outdoor'
  | 'infrastructure'
  | 'virtual';

export type ObjectStatus =
  | 'draft'
  | 'active'
  | 'inactive'
  | 'under_maintenance'
  | 'demolished';

export type GeometryRepresentation = 'point' | 'polyline' | 'polygon' | 'circle' | 'ellipse' | 'none' | 'image';

export type NodeType =
  | 'waypoint'
  | 'door'
  | 'stairs'
  | 'elevator'
  | 'escalator'
  | 'ramp'
  | 'outdoor_junction'
  | 'virtual';

export type EdgeDirection = 'bidirectional' | 'forward_only' | 'backward_only';

export type EdgeTraversalType =
  | 'walkway'
  | 'stairs_up'
  | 'stairs_down'
  | 'elevator'
  | 'escalator'
  | 'ramp'
  | 'outdoor_path'
  | 'vehicle_path';

export type AccessRuleTarget = 'object' | 'edge' | 'floor' | 'building';

export type AccessRuleType =
  | 'closure'
  | 'restricted'
  | 'time_restricted'
  | 'maintenance';

export type AssetType =
  | 'floor_plan_image'
  | 'floor_plan_svg'
  | 'building_photo'
  | 'object_photo'
  | 'campus_map'
  | 'logo'
  | 'document'
  | 'icon';

// ---- Domain Interfaces (DB Row shapes) ----

export interface DBOrganization {
  id: string;
  slug: string;
  name: LocalizedString;
  description?: LocalizedString;
  logo_url?: string;
  website_url?: string;
  contact_email?: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DBCampus {
  id: string;
  organization_id: string;
  slug: string;
  code: string;
  name: LocalizedString;
  description?: LocalizedString;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
  geo_center?: GeoJSON.Point;
  geo_bounds?: GeoJSON.Polygon;
  coordinate_system: 'pixel' | 'metric' | 'geographic';
  map_settings: Record<string, unknown>;
  logo_url?: string;
  is_active: boolean;
  is_published: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DBBuilding {
  id: string;
  campus_id: string;
  code: string;
  name: LocalizedString;
  description?: LocalizedString;
  geo_footprint?: GeoJSON.Polygon;
  plan_footprint?: GeoJSON.Polygon;
  total_floors: number;
  base_floor_level: number;
  entrance_node_ids: string[];
  is_accessible: boolean;
  is_active: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DBFloor {
  id: string;
  building_id: string;
  campus_id: string;
  code: string;
  name: LocalizedString;
  floor_number: number;
  width: number;
  height: number;
  geo_outline?: GeoJSON.Polygon;
  plan_image_url?: string;
  plan_svg_url?: string;
  map_settings: {
    offsetX?: number;
    offsetY?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
  };
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DBObjectType {
  id: string;
  slug: string;
  name: LocalizedString;
  description?: LocalizedString;
  category: DBObjectCategory;
  icon_name: string;
  default_color: string;
  property_schema: Record<string, unknown>; // JSON Schema Draft-07
  is_navigable: boolean;
  is_barrier: boolean;
  is_connector: boolean;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DBObject {
  id: string;
  campus_id: string;
  building_id?: string;
  floor_id?: string;
  object_type_id: string;
  code?: string;
  name: LocalizedString;
  description?: LocalizedString;
  geometry?: GeoJSON.Geometry;
  geometry_type: GeometryRepresentation;
  geo_geometry?: GeoJSON.Geometry;
  nav_node_id?: string;
  properties: Record<string, unknown>;
  tags: string[];
  status: ObjectStatus;
  is_accessible: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DBNavNode {
  id: string;
  campus_id: string;
  building_id?: string;
  floor_id?: string;
  object_id?: string;
  node_type: NodeType;
  label?: string;
  x: number;
  y: number;
  geo_point?: GeoJSON.Point;
  is_accessible: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DBNavEdge {
  id: string;
  campus_id: string;
  source_node_id: string;
  target_node_id: string;
  traversal_type: EdgeTraversalType;
  direction: EdgeDirection;
  distance_meters: number;
  weight: number;
  time_seconds: number; // computed column
  is_walkable: boolean;
  is_vehicle_accessible: boolean;
  is_accessible: boolean;
  is_active: boolean;
  from_floor_id?: string;
  to_floor_id?: string;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DBAccessRule {
  id: string;
  campus_id: string;
  target_type: AccessRuleTarget;
  object_id?: string;
  edge_id?: string;
  floor_id?: string;
  building_id?: string;
  rule_type: AccessRuleType;
  name: string;
  description?: string;
  valid_from?: string;
  valid_until?: string;
  active_days?: number[];
  open_time?: string;
  close_time?: string;
  allowed_roles?: string[];
  is_routing_blocked: boolean;
  is_active: boolean;
  closure_reason?: LocalizedString;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DBAsset {
  id: string;
  campus_id: string;
  asset_type: AssetType;
  organization_id?: string;
  building_id?: string;
  floor_id?: string;
  object_id?: string;
  object_type_id?: string;
  file_name: string;
  file_url: string;
  file_size_bytes?: number;
  mime_type?: string;
  width_px?: number;
  height_px?: number;
  map_alignment: {
    offsetX?: number;
    offsetY?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
  };
  alt_text?: LocalizedString;
  is_primary: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

// ---- Shared Utilities ----
// LocalizedString is re-exported from multilingual.ts (see top of file)

// ---- View / Joined Types ----

/** From v_objects_with_type */
export interface DBObjectWithType extends DBObject {
  type_slug: string;
  type_category: DBObjectCategory;
  type_icon: string;
  type_color: string;
  type_is_navigable: boolean;
  type_is_connector: boolean;
}

/** From v_nav_graph */
export interface DBNavGraphEdge extends DBNavEdge {
  source_x: number;
  source_y: number;
  source_floor_id?: string;
  source_node_type: NodeType;
  target_x: number;
  target_y: number;
  target_floor_id?: string;
  target_node_type: NodeType;
}

/** From v_campus_summary */
export interface DBCampusSummary {
  campus_id: string;
  organization_id: string;
  slug: string;
  name: LocalizedString;
  is_published: boolean;
  building_count: number;
  floor_count: number;
  object_count: number;
  node_count: number;
  edge_count: number;
}
