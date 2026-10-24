import { GeoPoint } from './common';
import { LocalizedString } from './multilingual';

/**
 * Campus domain model
 */

export interface CampusMetadata {
  address?: string;
  contactEmail?: string;
  website?: string;
  timezone?: string;
  establishedYear?: number;
  tags?: string[];
}

export interface Campus {
  id: string;
  slug: string; // e.g. "tech-institute" or "metro-health"
  name: LocalizedString;
  code: string;
  description: LocalizedString;
  center: GeoPoint;
  bounds?: [GeoPoint, GeoPoint];
  logoUrl?: string;
  metadata?: CampusMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampusInput {
  slug: string;
  name: LocalizedString;
  code: string;
  description: LocalizedString;
  center: GeoPoint;
  metadata?: CampusMetadata;
}
