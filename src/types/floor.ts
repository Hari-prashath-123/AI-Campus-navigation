import { LocalizedString } from './multilingual';

/**
 * Floor domain model
 */

export interface FloorOverlayConfig {
  opacity: number;
  rotationDegrees: number;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

export interface Floor {
  id: string;
  buildingId: string;
  campusId: string;
  level: number; // e.g. -1 for Basement, 0 for Ground, 1 for 1st Floor
  code: string; // e.g. "FL-01"
  name: LocalizedString;
  planImageUrl?: string;
  svgContent?: string;
  dimensions: {
    widthMeters: number;
    heightMeters: number;
  };
  overlayConfig?: FloorOverlayConfig;
  nodeCount?: number;
  objectCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFloorInput {
  buildingId: string;
  campusId: string;
  level: number;
  code: string;
  name: LocalizedString;
  dimensions: {
    widthMeters: number;
    heightMeters: number;
  };
  planImageUrl?: string;
}
