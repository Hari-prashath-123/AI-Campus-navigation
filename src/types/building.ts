import { GeoPoint, Point2D } from './common';
import { LocalizedString } from './multilingual';

/**
 * Building domain model
 */

export interface BuildingFootprint {
  coordinates: Point2D[] | GeoPoint[];
}

export interface Building {
  id: string;
  campusId: string;
  code: string; // e.g. "ENG-BLD"
  name: LocalizedString;
  description?: LocalizedString;
  totalFloors: number;
  entranceNodeIds: string[];
  geoCenter?: GeoPoint;
  footprint?: BuildingFootprint;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBuildingInput {
  campusId: string;
  code: string;
  name: LocalizedString;
  description?: LocalizedString;
  totalFloors: number;
}
