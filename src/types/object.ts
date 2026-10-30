import { Point2D } from './common';
import { LocalizedString } from './multilingual';
import { ObjectCategory } from './object-type';
import { GeometryRepresentation } from './db-schema';

/**
 * MapObject (POI, Room, Amenity) Domain Model
 */

export interface MapObject {
  id: string;
  campusId: string;
  buildingId: string;
  floorId: string;
  code: string; // e.g. "ROOM-101" or "ELEV-01"
  name: LocalizedString;
  description?: LocalizedString;
  category: ObjectCategory | string;

  /** Object type template reference (links to ObjectType.id) */
  objectTypeId?: string;

  /** Lifecycle status of object */
  status?: 'draft' | 'active' | 'inactive' | 'archived' | 'under_maintenance' | 'demolished';
  isArchived?: boolean;

  /** Internal sub-zone hierarchy: reference to enclosing parent room/object */
  parentObjectId?: string;
  subZoneType?: 'workstation' | 'staff_area' | 'cabin' | 'equipment_zone' | 'storage_bay' | 'restricted_zone' | string;

  /** Configurable access schedule & temporary closure info */
  accessSchedule?: {
    openTime?: string; // HH:MM
    closeTime?: string; // HH:MM
    activeDays?: number[]; // 0=Sunday..6=Saturday
    isRestricted?: boolean;
    allowedRoles?: string[];
    closureReason?: string;
  };

  /** Type-specific property values validated against ObjectType.propertyDefinitions */
  properties?: Record<string, unknown>;

  /** Authoritative plan-space geometry (GeoJSON in canvas CRS) */
  geometry?: GeoJSON.Geometry;
  /** How the object is represented visually */
  geometryType?: GeometryRepresentation;

  coordinates: Point2D; // Centroid / anchor point in plan space (meters)
  associatedNodeId: string; // Primary navigation node (entrance door)
  entranceNodeIds?: string[]; // All entrance nodes (for rooms with multiple doors)
  isAccessible: boolean; // Wheelchair accessible
  tags?: string[];

  // Rich Metadata (Landmarks & Entities)
  images?: string[];
  historicalInfo?: LocalizedString;
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
    personName?: string;
  };
  externalLinks?: { title: string; url: string }[];
  /** Legacy attribute bag — prefer properties for new objects */
  attributes?: {
    capacity?: number;
    occupantName?: string;
    operatingHours?: string;
    phoneExtension?: string;
    hasPowerOutlets?: boolean;
    hasProjector?: boolean;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateMapObjectInput {
  campusId: string;
  buildingId: string;
  floorId: string;
  code: string;
  name: LocalizedString;
  category: ObjectCategory | string;
  objectTypeId?: string;
  properties?: Record<string, unknown>;
  geometry?: GeoJSON.Geometry;
  geometryType?: GeometryRepresentation;
  coordinates: Point2D;
  associatedNodeId: string;
  entranceNodeIds?: string[];
  isAccessible?: boolean;
  status?: 'draft' | 'active' | 'inactive' | 'archived' | 'under_maintenance' | 'demolished';
  isArchived?: boolean;
  parentObjectId?: string;
  subZoneType?: 'workstation' | 'staff_area' | 'cabin' | 'equipment_zone' | 'storage_bay' | 'restricted_zone' | string;
  accessSchedule?: {
    openTime?: string;
    closeTime?: string;
    activeDays?: number[];
    isRestricted?: boolean;
    allowedRoles?: string[];
    closureReason?: string;
  };
  attributes?: Record<string, any>;
}
