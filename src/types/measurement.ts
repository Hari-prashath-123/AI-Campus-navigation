// ============================================================
// Map Coordinate System & Real-World Measurement Types
// ============================================================

export type UnitSystem = 'metric' | 'imperial';
export type LengthUnit = 'meters' | 'feet';

/** 
 * Normalized logical coordinate — always stored in meters.
 * The map renders by converting meters → pixels using scale.
 */
export interface NormalizedPoint {
  xMeters: number;
  yMeters: number;
}

/** Settings that define how a map canvas maps to real-world dimensions */
export interface MapCalibration {
  // Real-world dimensions of the full canvas
  realWidthMeters: number;
  realHeightMeters: number;

  // Unit preference for display
  unitSystem: UnitSystem;

  // Canvas logical size (pixels at 1:1 zoom)
  canvasWidthPx: number;
  canvasHeightPx: number;

  // Derived: pixels per meter (computed from above)
  // pxPerMeter = canvasWidthPx / realWidthMeters
}

/** 
 * Real-world geometry attached to a drawn shape.
 * All values stored in meters regardless of unit display preference.
 */
export interface RealWorldGeometry {
  // Normalized origin in meters from top-left of canvas
  originXMeters: number;
  originYMeters: number;

  // Shape dimensions in meters (for rect/polygon)
  widthMeters?: number;
  heightMeters?: number;

  // Area in m² (computed)
  areaM2?: number;

  // For polylines: total length in meters
  lengthMeters?: number;

  // Raw polygon points in meters [[x1,y1],[x2,y2],...]
  pointsMeters?: [number, number][];

  // Rotation in degrees
  rotationDeg: number;
}

// Conversion constants
export const METERS_PER_FOOT = 0.3048;
export const FEET_PER_METER = 3.28084;

export const toFeet = (meters: number) => meters * FEET_PER_METER;
export const toMeters = (feet: number) => feet * METERS_PER_FOOT;

export const formatLength = (meters: number, unit: UnitSystem): string => {
  if (unit === 'imperial') {
    return `${(meters * FEET_PER_METER).toFixed(1)} ft`;
  }
  return `${meters.toFixed(1)} m`;
};

export const formatArea = (m2: number, unit: UnitSystem): string => {
  if (unit === 'imperial') {
    const ft2 = m2 * FEET_PER_METER * FEET_PER_METER;
    return `${ft2.toFixed(1)} ft²`;
  }
  return `${m2.toFixed(1)} m²`;
};

/** Default calibration for a new floor */
export const DEFAULT_CALIBRATION: MapCalibration = {
  realWidthMeters: 100,
  realHeightMeters: 80,
  unitSystem: 'metric',
  canvasWidthPx: 1200,
  canvasHeightPx: 960,
};

/** Convert canvas pixels → meters */
export const pxToMeters = (px: number, calibration: MapCalibration): number => {
  return (px / calibration.canvasWidthPx) * calibration.realWidthMeters;
};

/** Convert meters → canvas pixels */
export const metersToPx = (m: number, calibration: MapCalibration): number => {
  return (m / calibration.realWidthMeters) * calibration.canvasWidthPx;
};

/** Compute pxPerMeter from calibration */
export const getPxPerMeter = (calibration: MapCalibration): number => {
  return calibration.canvasWidthPx / calibration.realWidthMeters;
};
