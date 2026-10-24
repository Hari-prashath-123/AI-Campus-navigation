import { Point2D, GeoPoint, LocalizedString } from '../types';

/**
 * Spatial & Data Schema Validation Utilities
 */

export const isValidString = (val: unknown): val is string => {
  return typeof val === 'string' && val.trim().length > 0;
};

export const isValidSlug = (slug: string): boolean => {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};

export const isValidPoint2D = (point: unknown): point is Point2D => {
  if (!point || typeof point !== 'object') return false;
  const p = point as Point2D;
  return typeof p.x === 'number' && !isNaN(p.x) && typeof p.y === 'number' && !isNaN(p.y);
};

export const isValidGeoPoint = (point: unknown): point is GeoPoint => {
  if (!point || typeof point !== 'object') return false;
  const p = point as GeoPoint;
  return (
    typeof p.lat === 'number' &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    typeof p.lng === 'number' &&
    p.lng >= -180 &&
    p.lng <= 180
  );
};

export const isValidLocalizedString = (loc: unknown): loc is LocalizedString => {
  if (!loc || typeof loc !== 'object') return false;
  const l = loc as Record<string, string>;
  return typeof l.en === 'string' && l.en.trim().length > 0;
};

/**
 * Generate a clean unique ID for spatial entities
 */
export const generateEntityId = (prefix: string): string => {
  const randomPart = Math.random().toString(36).substring(2, 9);
  const timestamp = Date.now().toString(36).substring(4);
  return `${prefix}-${timestamp}${randomPart}`;
};
