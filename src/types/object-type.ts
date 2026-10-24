/**
 * Object Type System — Full Property Definition Schema
 * Replaces the minimal ObjectTypeDefinition from object-type.ts
 */

// ─── Property field types ────────────────────────────────────────────────────

export type PropertyFieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'image'
  | 'time'
  | 'date'
  | 'dimensions'
  | 'object_reference';

// ─── Per-type option shapes ───────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface DimensionsConfig {
  unit: 'meters' | 'feet' | 'centimeters';
  fields: Array<'length' | 'width' | 'height' | 'area'>;
}

export interface ObjectReferenceConfig {
  targetTypeSlug?: string; // if set, restricts references to a specific object type
  label: string;
}

// ─── Property Definition ─────────────────────────────────────────────────────

export interface PropertyDefinition {
  id: string;                      // local UUID, used as key in the properties JSONB
  key: string;                     // machine key, e.g. "capacity", "opening_hours"
  label: string;                   // display label, e.g. "Seating Capacity"
  type: PropertyFieldType;
  description?: string;            // helper text shown below the field
  required: boolean;
  isVisibleOnCard: boolean;        // show on the object summary card in map view
  isSearchable: boolean;           // include in full-text / tag search
  sortOrder: number;

  // ── Type-specific configs ──────────────────────────────────────────────────
  placeholder?: string;
  defaultValue?: string | number | boolean | null;

  // text
  maxLength?: number;
  multiline?: boolean;

  // number
  min?: number;
  max?: number;
  step?: number;
  unit?: string;                   // e.g. "kg", "m²", "kW"

  // select / multi_select
  options?: SelectOption[];

  // dimensions
  dimensionsConfig?: DimensionsConfig;

  // object_reference
  referenceConfig?: ObjectReferenceConfig;
}

// ─── Object Category ─────────────────────────────────────────────────────────

export type ObjectCategory =
  | 'room'
  | 'amenity'
  | 'transit'
  | 'entrance'
  | 'outdoor'
  | 'infrastructure'
  | 'virtual';

export const OBJECT_CATEGORIES: Array<{ value: ObjectCategory; label: string; description: string }> = [
  { value: 'room',           label: 'Room',           description: 'Enclosed spaces: classrooms, labs, offices' },
  { value: 'amenity',        label: 'Amenity',        description: 'Services: restrooms, cafeterias, ATMs' },
  { value: 'transit',        label: 'Transit',        description: 'Movement: stairs, elevators, corridors' },
  { value: 'entrance',       label: 'Entrance',       description: 'Access points: doors, gates, exits' },
  { value: 'outdoor',        label: 'Outdoor',        description: 'Exterior: roads, paths, parking, statues' },
  { value: 'infrastructure', label: 'Infrastructure', description: 'Utilities: server rooms, plant rooms' },
  { value: 'virtual',        label: 'Virtual',        description: 'Nav-only waypoints, hidden from end users' },
];

// ─── ObjectType ───────────────────────────────────────────────────────────────

export interface ObjectType {
  id: string;
  slug: string;                    // URL-safe, unique, e.g. "classroom", "fire-exit"
  name: string;                    // Display name in English (multilingual omitted for MVP)
  description: string;
  category: ObjectCategory;
  iconName: string;                // Lucide icon key
  color: string;                   // Hex color
  isNavigable: boolean;            // Can be a route destination
  isBarrier: boolean;              // Blocks pathfinding
  isConnector: boolean;            // Links floors/buildings (elevator, stairs)
  isSystem: boolean;               // Built-in, cannot be deleted
  propertyDefinitions: PropertyDefinition[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Form data (for Create / Edit) ───────────────────────────────────────────

export interface ObjectTypeFormData {
  slug: string;
  name: string;
  description: string;
  category: ObjectCategory;
  iconName: string;
  color: string;
  isNavigable: boolean;
  isBarrier: boolean;
  isConnector: boolean;
  propertyDefinitions: PropertyDefinition[];
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ObjectTypeValidationErrors {
  slug?: string;
  name?: string;
  description?: string;
  category?: string;
  properties?: Record<string, string>; // propId -> errorMsg
  form?: string;
}
