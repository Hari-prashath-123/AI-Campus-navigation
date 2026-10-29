import { GeometryRepresentation } from './db-schema';
import { Point2D } from './common';
import { RealWorldGeometry, MapCalibration } from './measurement';

export type EditorTool = 
  | 'select' 
  | 'pan' 
  | 'rectangle' 
  | 'polygon' 
  | 'line' 
  | 'point' 
  | 'circle'
  | 'ellipse'
  | 'add_node' 
  | 'add_edge' 
  | 'connect_floors';

export interface EditorViewport {
  zoom: number;
  center: Point2D;
  rotation: number;
}

export type EditorMode = 'draw' | 'select' | 'navigate' | 'connect';

export interface LayerVisibility {
  floorplanImage: boolean;
  nodes: boolean;
  edges: boolean;
  objects: boolean;
  grid: boolean;
  validationWarnings?: boolean;
}

export interface EditorShape {
  id: string;
  objectId?: string;
  objectTypeId: string;
  geometryType: GeometryRepresentation;
  /** Canvas pixel position / size — ephemeral, derived from realWorld + calibration */
  points: number[];
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  name: string;
  color: string;
  attributes?: Record<string, any>;
  /** Authoritative real-world geometry in meters — persisted to DB */
  realWorld?: RealWorldGeometry;
}

export interface MapEditorState {
  activeCampusId: string | null;
  activeBuildingId: string | null;
  activeFloorId: string | null;
  selectedTool: EditorTool;
  selectedEntityIds: string[];
  viewport: EditorViewport;
  layers: LayerVisibility;
  isGridSnapping: boolean;
  gridSize: number;
  shapes: EditorShape[];
  calibration: MapCalibration;
}

export interface HistoryState {
  past: EditorShape[][];
  present: EditorShape[];
  future: EditorShape[][];
}
