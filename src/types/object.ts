import { Point2D } from './common';
import { LocalizedString } from './multilingual';
import { ObjectCategory } from './object-type';

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
  coordinates: Point2D; // Normalized coordinates on floor plan (0-100% or absolute meters)
  associatedNodeId: string; // Graph node associated with entrance to this object
  isAccessible: boolean; // Wheelchair accessible
  tags?: string[];
  
  // Rich Metadata (Landmarks & Entities)
  images?: string[]; // URLs to images
  historicalInfo?: LocalizedString;
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
    personName?: string;
  };
  externalLinks?: { title: string; url: string }[];
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
  coordinates: Point2D;
  associatedNodeId: string;
  isAccessible?: boolean;
  attributes?: Record<string, any>;
}
