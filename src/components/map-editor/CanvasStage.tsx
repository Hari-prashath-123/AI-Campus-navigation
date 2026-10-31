import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Line, Ellipse, Transformer, Group, Text, Image as KonvaImage } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { EditorShape, EditorTool, Point2D, ObjectType, MapCalibration, LayerVisibility, FloorOverlayConfig } from '../../types';
import { SpatialNode, CampusConnection, SpatialNodeType } from '../../types/connection';
import { GraphValidationError } from '../../utils/graph-validation';
import { pxToMeters } from '../../types/measurement';
import { v4 as uuidv4 } from 'uuid';

interface DraftMeasure {
  x: number; y: number; w: number; h: number;
  type: 'polygon' | 'polyline' | 'point' | null;
  visible: boolean;
}

export interface CanvasStageProps {
  shapes: EditorShape[];
  setShapes: (shapes: EditorShape[] | ((prev: EditorShape[]) => EditorShape[])) => void;
  onShapeFinalized: (shape: EditorShape) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  tool: EditorTool;
  gridSize: number;
  isSnapping: boolean;
  onCoordinatesChange: (pt: Point2D) => void;
  activeType: ObjectType | null;
  calibration: MapCalibration;
  onDraftMeasure: (m: DraftMeasure) => void;

  // Graph network props
  nodes?: SpatialNode[];
  connections?: CampusConnection[];
  layers?: LayerVisibility;
  activeCampusId?: string;
  activeFloorId?: string;
  activeBuildingId?: string;
  onNodeCreated?: (node: SpatialNode) => void;
  onNodeUpdated?: (id: string, patch: Partial<SpatialNode>) => void;
  onNodeSelected?: (node: SpatialNode | null) => void;
  onEdgeCreated?: (edge: CampusConnection) => void;
  onEdgeSelected?: (edge: CampusConnection | null) => void;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
  validationIssues?: GraphValidationError[];
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  nodeTypeToCreate?: SpatialNodeType;

  // Reference floorplan image props
  floorplanImageUrl?: string | null;
  overlayConfig?: FloorOverlayConfig;
  onOverlayConfigChange?: (cfg: FloorOverlayConfig) => void;
  fitToViewTrigger?: number;
}

const NODE_COLORS: Record<SpatialNodeType, string> = {
  hallway: '#3b82f6', // blue
  door: '#f59e0b',    // amber
  stairs: '#8b5cf6',  // purple
  elevator: '#10b981',// emerald
  entrance: '#ec4899',// pink
  ramp: '#14b8a6',    // teal
  bridge: '#6366f1',  // indigo
  outdoor_waypoint: '#64748b', // slate
};

export const CanvasStage: React.FC<CanvasStageProps> = ({
  shapes, setShapes, onShapeFinalized, selectedIds, setSelectedIds,
  tool, gridSize, isSnapping, onCoordinatesChange, activeType, calibration, onDraftMeasure,
  nodes = [], connections = [], layers = { floorplanImage: true, nodes: true, edges: true, objects: true, grid: true, validationWarnings: true },
  activeCampusId, activeFloorId, activeBuildingId,
  onNodeCreated, onNodeUpdated, onNodeSelected, onEdgeCreated, onEdgeSelected,
  selectedNodeId, selectedEdgeId, validationIssues = [],
  zoom = 100, onZoomChange, nodeTypeToCreate = 'hallway',
  floorplanImageUrl, overlayConfig, fitToViewTrigger,
}) => {
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(zoom / 100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [newShape, setNewShape] = useState<EditorShape | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 1200, h: 800 });

  // Spacebar temporary hand-pan state
  const [isSpacePanning, setIsSpacePanning] = useState(false);

  // Middle-mouse button pan state
  const [isMiddlePanning, setIsMiddlePanning] = useState(false);

  // Marquee drag selection box
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<Point2D>({ x: 0, y: 0 });
  const [marqueeCurrent, setMarqueeCurrent] = useState<Point2D>({ x: 0, y: 0 });

  // Edge drawing state
  const [edgeStartNodeId, setEdgeStartNodeId] = useState<string | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<Point2D>({ x: 0, y: 0 });

  // Multi-point polygon drawing state
  const [polygonDraftPoints, setPolygonDraftPoints] = useState<number[]>([]);

  // Loaded background floorplan image
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Load floorplan reference image
  useEffect(() => {
    if (!floorplanImageUrl) {
      setBgImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = floorplanImageUrl;
    img.onload = () => setBgImage(img);
    img.onerror = () => {
      console.warn('Failed to load floorplan reference image:', floorplanImageUrl);
      setBgImage(null);
    };
  }, [floorplanImageUrl]);

  // Sync zoom prop to internal scale
  useEffect(() => {
    if (Math.abs(scale - zoom / 100) > 0.01) {
      setScale(zoom / 100);
    }
  }, [zoom]);

  // Cancel edge or polygon draft if tool changes
  useEffect(() => {
    if (tool !== 'add_edge') {
      setEdgeStartNodeId(null);
    }
    if (tool !== 'polygon') {
      setPolygonDraftPoints([]);
    }
  }, [tool]);

  // Spacebar and Enter/Escape listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Space' && !e.repeat && tool !== 'pan') {
        setIsSpacePanning(true);
      }
      if (e.key === 'Enter' && tool === 'polygon') {
        finishPolygon();
      }
      if (e.key === 'Escape' && tool === 'polygon') {
        setPolygonDraftPoints([]);
        onDraftMeasure({ x: 0, y: 0, w: 0, h: 0, type: null, visible: false });
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [tool, polygonDraftPoints]);

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setContainerSize({ w: width, h: height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const snap = (val: number) => (isSnapping ? Math.round(val / gridSize) * gridSize : val);

  // Finalize polygon multi-click drawing
  const finishPolygon = useCallback((extraPoint?: { x: number; y: number }) => {
    let pts = [...polygonDraftPoints];
    if (extraPoint) {
      pts.push(extraPoint.x, extraPoint.y);
    }
    if (pts.length < 6) {
      setPolygonDraftPoints([]);
      return;
    }
    const xs = pts.filter((_, i) => i % 2 === 0);
    const ys = pts.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const width = Math.max(5, maxX - minX);
    const height = Math.max(5, maxY - minY);

    // Compute polygon area using Shoelace formula
    let areaPx = 0;
    const numPts = pts.length / 2;
    for (let i = 0; i < numPts; i++) {
      const x1 = pts[i * 2];
      const y1 = pts[i * 2 + 1];
      const x2 = pts[((i + 1) % numPts) * 2];
      const y2 = pts[((i + 1) % numPts) * 2 + 1];
      areaPx += (x1 * y2) - (x2 * y1);
    }
    areaPx = Math.abs(areaPx) / 2;
    const pxPerM = calibration.canvasWidthPx / calibration.realWidthMeters;
    const areaM2 = areaPx / (pxPerM * pxPerM);

    const finalShape: EditorShape = {
      id: uuidv4(),
      objectTypeId: activeType?.id || 'generic',
      geometryType: 'polygon',
      points: pts,
      x: minX,
      y: minY,
      width,
      height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      name: activeType ? `New ${activeType.name}` : 'New Polygon Area',
      color: activeType?.color || '#3b82f6',
      realWorld: {
        originXMeters: pxToMeters(minX, calibration),
        originYMeters: pxToMeters(minY, calibration),
        widthMeters: width / pxPerM,
        heightMeters: height / pxPerM,
        areaM2,
        rotationDeg: 0,
      },
    };
    onShapeFinalized(finalShape);
    setPolygonDraftPoints([]);
    onDraftMeasure({ x: 0, y: 0, w: 0, h: 0, type: null, visible: false });
  }, [polygonDraftPoints, activeType, calibration, onShapeFinalized, onDraftMeasure]);

  // Fit to view calculation
  const fitToView = useCallback(() => {
    const containerW = containerSize.w;
    const containerH = containerSize.h;
    if (containerW <= 0 || containerH <= 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    shapes.forEach(s => {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + (s.width || 30));
      maxY = Math.max(maxY, s.y + (s.height || 30));
    });

    nodes.forEach(n => {
      minX = Math.min(minX, n.coordinates.x);
      minY = Math.min(minY, n.coordinates.y);
      maxX = Math.max(maxX, n.coordinates.x);
      maxY = Math.max(maxY, n.coordinates.y);
    });

    if (bgImage) {
      const imgW = (bgImage.width || 800) * (overlayConfig?.scaleX ?? 1);
      const imgH = (bgImage.height || 600) * (overlayConfig?.scaleY ?? 1);
      const imgX = overlayConfig?.offsetX ?? 0;
      const imgY = overlayConfig?.offsetY ?? 0;
      minX = Math.min(minX, imgX);
      minY = Math.min(minY, imgY);
      maxX = Math.max(maxX, imgX + imgW);
      maxY = Math.max(maxY, imgY + imgH);
    }

    if (minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = calibration.canvasWidthPx || 1000;
      maxY = calibration.canvasHeightPx || 700;
    }

    const padding = 50;
    const boundsW = Math.max(100, maxX - minX);
    const boundsH = Math.max(100, maxY - minY);

    const scaleX = (containerW - padding * 2) / boundsW;
    const scaleY = (containerH - padding * 2) / boundsH;
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.15), 3.0);

    const newPosX = (containerW - boundsW * newScale) / 2 - minX * newScale;
    const newPosY = (containerH - boundsH * newScale) / 2 - minY * newScale;

    setScale(newScale);
    setPosition({ x: newPosX, y: newPosY });
    onZoomChange?.(Math.round(newScale * 100));
  }, [containerSize, shapes, nodes, bgImage, overlayConfig, calibration, onZoomChange]);

  // Trigger fit to view when requested
  useEffect(() => {
    if (fitToViewTrigger && fitToViewTrigger > 0) {
      fitToView();
    }
  }, [fitToViewTrigger, fitToView]);

  // Sync transformer to selected shape nodes
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const konvaNodes = selectedIds.map(id => stageRef.current.findOne(`#${id}`)).filter(Boolean);
      transformerRef.current.nodes(konvaNodes);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIds, shapes]);

  const getRelativePointerPosition = (): Point2D => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    return transform.point(pos);
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const scaleBy = 1.08;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    newScale = Math.max(0.1, Math.min(newScale, 10));
    setScale(newScale);
    setPosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
    onZoomChange?.(Math.round(newScale * 100));
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (tool === 'pan' || isSpacePanning) return;
    const isStage = e.target === stageRef.current;
    const pos = getRelativePointerPosition();
    const sp = { x: snap(pos.x), y: snap(pos.y) };

    if (tool === 'select') {
      if (isStage) {
        if (!e.evt.shiftKey) {
          setSelectedIds([]);
          onNodeSelected?.(null);
          onEdgeSelected?.(null);
        }
        // Start marquee selection
        setIsMarqueeSelecting(true);
        setMarqueeStart(pos);
        setMarqueeCurrent(pos);
      }
      return;
    }

    // Tool: Add Node
    if (tool === 'add_node') {
      if (onNodeCreated && activeCampusId) {
        const newNode: SpatialNode = {
          id: uuidv4(),
          campusId: activeCampusId,
          buildingId: activeBuildingId,
          floorId: activeFloorId,
          type: nodeTypeToCreate,
          coordinates: { x: sp.x, y: sp.y },
          isAccessible: true,
          label: `${nodeTypeToCreate.charAt(0).toUpperCase() + nodeTypeToCreate.slice(1)} (${Math.round(sp.x)}, ${Math.round(sp.y)})`,
        };
        onNodeCreated(newNode);
      }
      return;
    }

    // Tool: Polygon (click-to-place multi-vertex drawing)
    if (tool === 'polygon') {
      if (polygonDraftPoints.length === 0) {
        setPolygonDraftPoints([sp.x, sp.y]);
      } else {
        const startX = polygonDraftPoints[0];
        const startY = polygonDraftPoints[1];
        const distToStart = Math.hypot(sp.x - startX, sp.y - startY);
        if (distToStart < 15 && polygonDraftPoints.length >= 6) {
          finishPolygon();
        } else {
          setPolygonDraftPoints(prev => [...prev, sp.x, sp.y]);
        }
      }
      return;
    }

    // Tool: Add Edge
    if (tool === 'add_edge') {
      return;
    }

    // Shape Drawing Tools
    if (isStage) {
      setIsDrawing(true);
      const geomType = tool === 'line' ? 'polyline' : tool === 'point' ? 'point' : tool === 'circle' ? 'circle' : tool === 'ellipse' ? 'ellipse' : 'polygon';

      const shape: EditorShape = {
        id: `draft_${uuidv4()}`,
        objectTypeId: activeType?.id || 'generic',
        geometryType: geomType,
        points: [sp.x, sp.y, sp.x, sp.y],
        x: sp.x, y: sp.y,
        width: 0, height: 0,
        rotation: 0, scaleX: 1, scaleY: 1,
        name: activeType ? `New ${activeType.name}` : 'New Shape',
        color: activeType?.color || '#3b82f6',
      };
      setNewShape(shape);
      setSelectedIds([]);

      if (tool === 'point') {
        const final = { ...shape, id: uuidv4() };
        onShapeFinalized(final);
        setIsDrawing(false);
        setNewShape(null);
        onDraftMeasure({ x: 0, y: 0, w: 0, h: 0, type: null, visible: false });
      }
    }
  };

  const handleMouseMove = () => {
    if (!stageRef.current) return;
    const pos = getRelativePointerPosition();
    setMouseCanvasPos(pos);
    onCoordinatesChange({ x: Math.round(pos.x), y: Math.round(pos.y) });

    // Handle active marquee box update
    if (isMarqueeSelecting) {
      setMarqueeCurrent(pos);
      return;
    }

    // Handle polygon draft live preview
    if (tool === 'polygon' && polygonDraftPoints.length > 0) {
      const curPt = { x: snap(pos.x), y: snap(pos.y) };
      const allX = [...polygonDraftPoints.filter((_, i) => i % 2 === 0), curPt.x];
      const allY = [...polygonDraftPoints.filter((_, i) => i % 2 === 1), curPt.y];
      const minX = Math.min(...allX);
      const minY = Math.min(...allY);
      const maxX = Math.max(...allX);
      const maxY = Math.max(...allY);
      const stagePos = stageRef.current.getPointerPosition();
      if (stagePos) {
        onDraftMeasure({
          x: stagePos.x,
          y: stagePos.y,
          w: maxX - minX,
          h: maxY - minY,
          type: 'polygon',
          visible: true,
        });
      }
      return;
    }

    if (!isDrawing || !newShape) return;

    const cur = { x: snap(pos.x), y: snap(pos.y) };

    if (tool === 'rectangle' || tool === 'circle' || tool === 'ellipse') {
      const rawW = cur.x - newShape.x;
      const rawH = cur.y - newShape.y;

      let w = Math.abs(rawW);
      let h = Math.abs(rawH);
      if (tool === 'circle') {
        w = Math.max(w, h);
        h = w;
      }

      const updated: EditorShape = {
        ...newShape,
        width: w,
        height: h,
        x: rawW < 0 && tool !== 'circle' ? cur.x : newShape.x,
        y: rawH < 0 && tool !== 'circle' ? cur.y : newShape.y,
      };
      setNewShape(updated);

      const stagePos = stageRef.current.getPointerPosition();
      const origin = stageRef.current.getAbsoluteTransform().point({ x: newShape.x, y: newShape.y });
      if (stagePos) {
        onDraftMeasure({
          x: Math.min(origin.x, stagePos.x),
          y: Math.min(origin.y, stagePos.y),
          w: Math.abs(stagePos.x - origin.x),
          h: Math.abs(stagePos.y - origin.y),
          type: 'polygon',
          visible: true,
        });
      }
    } else if (tool === 'line') {
      const updated = { ...newShape, points: [newShape.points[0], newShape.points[1], cur.x, cur.y] };
      setNewShape(updated);
      const origin = stageRef.current.getAbsoluteTransform().point({ x: newShape.points[0], y: newShape.points[1] });
      const end = stageRef.current.getAbsoluteTransform().point({ x: cur.x, y: cur.y });
      onDraftMeasure({ x: origin.x, y: origin.y, w: end.x - origin.x, h: end.y - origin.y, type: 'polyline', visible: true });
    }
  };

  const handleMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    // Finalize marquee selection box
    if (isMarqueeSelecting) {
      setIsMarqueeSelecting(false);
      const minX = Math.min(marqueeStart.x, marqueeCurrent.x);
      const maxX = Math.max(marqueeStart.x, marqueeCurrent.x);
      const minY = Math.min(marqueeStart.y, marqueeCurrent.y);
      const maxY = Math.max(marqueeStart.y, marqueeCurrent.y);

      // Only treat as marquee if dragged more than 5px
      if (maxX - minX > 5 || maxY - minY > 5) {
        const enclosedShapeIds = shapes.filter(s => {
          const sw = s.width || 20;
          const sh = s.height || 20;
          return s.x < maxX && s.x + sw > minX && s.y < maxY && s.y + sh > minY;
        }).map(s => s.id);

        if (e.evt?.shiftKey) {
          setSelectedIds(Array.from(new Set([...selectedIds, ...enclosedShapeIds])));
        } else {
          setSelectedIds(enclosedShapeIds);
        }
      }
      return;
    }

    if (!isDrawing || !newShape) return;
    setIsDrawing(false);
    onDraftMeasure({ x: 0, y: 0, w: 0, h: 0, type: null, visible: false });

    if ((tool === 'rectangle' || tool === 'circle' || tool === 'ellipse') && (!newShape.width || !newShape.height || newShape.width < 5 || newShape.height < 5)) {
      setNewShape(null);
      return;
    }
    if (tool === 'line') {
      const [x1, y1, x2, y2] = newShape.points;
      if (Math.abs(x2 - x1) < 5 && Math.abs(y2 - y1) < 5) { setNewShape(null); return; }
    }

    const final = { ...newShape, id: uuidv4() };
    onShapeFinalized(final);
    setNewShape(null);
  };

  const handleShapeClick = (shapeId: string, e: KonvaEventObject<MouseEvent>) => {
    if (tool !== 'select') return;
    e.cancelBubble = true;

    if (e.evt.shiftKey) {
      // Toggle selection in multi-select mode
      if (selectedIds.includes(shapeId)) {
        setSelectedIds(selectedIds.filter(id => id !== shapeId));
      } else {
        setSelectedIds([...selectedIds, shapeId]);
      }
    } else {
      setSelectedIds([shapeId]);
    }
    onNodeSelected?.(null);
    onEdgeSelected?.(null);
  };

  const handleNodeClick = (node: SpatialNode, e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;

    if (tool === 'add_edge') {
      if (!edgeStartNodeId) {
        setEdgeStartNodeId(node.id);
      } else if (edgeStartNodeId !== node.id) {
        const startNode = nodes.find(n => n.id === edgeStartNodeId);
        if (startNode && onEdgeCreated && activeCampusId) {
          const dxM = pxToMeters(Math.abs(node.coordinates.x - startNode.coordinates.x), calibration);
          const dyM = pxToMeters(Math.abs(node.coordinates.y - startNode.coordinates.y), calibration);
          const dist = Math.max(1, Math.round(Math.sqrt(dxM * dxM + dyM * dyM)));

          const isVertical = startNode.type === 'stairs' || startNode.type === 'elevator' || node.type === 'stairs' || node.type === 'elevator';
          const connType = isVertical ? (startNode.type === 'elevator' ? 'elevator' : 'staircase') : (startNode.type === 'door' || node.type === 'door' ? 'door' : 'corridor');

          const newConn: CampusConnection = {
            id: uuidv4(),
            campusId: activeCampusId,
            sourceNodeId: startNode.id,
            sourceBuildingId: startNode.buildingId,
            sourceFloorId: startNode.floorId,
            targetNodeId: node.id,
            targetBuildingId: node.buildingId,
            targetFloorId: node.floorId,
            connectionType: connType,
            name: `${startNode.label || 'Node'} to ${node.label || 'Node'}`,
            isBidirectional: true,
            isAccessible: startNode.isAccessible && node.isAccessible,
            isWalkable: true,
            isVehicleAccessible: false,
            distanceMeters: dist,
            weightMultiplier: 1.0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          onEdgeCreated(newConn);
        }
        setEdgeStartNodeId(null);
      }
      return;
    }

    if (tool === 'select') {
      setSelectedIds([]);
      onEdgeSelected?.(null);
      onNodeSelected?.(node);
    }
  };

  const handleNodeDragEnd = (nodeId: string, e: KonvaEventObject<DragEvent>) => {
    const konvaNode = e.target;
    const newX = snap(konvaNode.x());
    const newY = snap(konvaNode.y());
    onNodeUpdated?.(nodeId, { coordinates: { x: newX, y: newY } });
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const id = e.target.id();
    const node = e.target;
    const newX = snap(node.x());
    const newY = snap(node.y());
    node.x(newX);
    node.y(newY);
    setShapes(prev => prev.map(s => {
      if (s.id !== id) return s;
      const dx = newX - s.x;
      const dy = newY - s.y;
      const updatedPoints = s.points ? s.points.map((p, i) => i % 2 === 0 ? p + dx : p + dy) : s.points;
      const xM = pxToMeters(newX, calibration);
      const yM = pxToMeters(newY, calibration);
      return {
        ...s,
        x: newX,
        y: newY,
        points: updatedPoints,
        realWorld: s.realWorld ? {
          ...s.realWorld,
          originXMeters: xM,
          originYMeters: yM,
        } : undefined,
      };
    }));
  };

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    const node = e.target;
    const id = node.id();
    // Read the actual visual dimensions from the Konva node before resetting scale
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const newX = snap(node.x());
    const newY = snap(node.y());
    const rot = Math.round(node.rotation());

    // Commit scale into width/height and reset scale to 1
    node.scaleX(1);
    node.scaleY(1);
    node.x(newX);
    node.y(newY);

    setShapes(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newW = Math.max(5, (s.width || 0) * scaleX);
      const newH = Math.max(5, (s.height || 0) * scaleY);
      const wM = pxToMeters(newW, calibration);
      const hM = pxToMeters(newH, calibration);
      const xM = pxToMeters(newX, calibration);
      const yM = pxToMeters(newY, calibration);
      const updatedPoints = s.points && s.points.length > 4
        ? s.points.map((p, i) => i % 2 === 0 ? newX + (p - s.x) * scaleX : newY + (p - s.y) * scaleY)
        : s.points;
      return {
        ...s,
        x: newX,
        y: newY,
        width: newW,
        height: newH,
        points: updatedPoints,
        scaleX: 1,
        scaleY: 1,
        rotation: rot,
        realWorld: {
          originXMeters: xM,
          originYMeters: yM,
          widthMeters: wM,
          heightMeters: hM,
          areaM2: wM * hM,
          rotationDeg: rot,
        },
      };
    }));
  };

  // Node Map for fast coordinate lookup
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Find start node for rubber band edge
  const edgeStartNode = edgeStartNodeId ? nodeMap.get(edgeStartNodeId) : null;

  // Set of entity IDs with validation issues
  const warningNodeIds = new Set(
    validationIssues
      .filter(i => i.category === 'node')
      .map(i => i.entityId)
  );
  const warningObjectIssues = new Map(
    validationIssues
      .filter(i => i.category === 'object')
      .map(i => [i.entityId, i])
  );
  const warningEdgeIds = new Set(
    validationIssues
      .filter(i => i.category === 'edge' || i.category === 'transition')
      .map(i => i.entityId)
  );

  // Render Grid Layer
  const renderGrid = () => {
    if (!layers.grid) return null;
    const lines: React.ReactNode[] = [];
    const W = calibration.canvasWidthPx || 2000;
    const H = calibration.canvasHeightPx || 1400;
    const pxPerM = calibration.canvasWidthPx / calibration.realWidthMeters;

    for (let x = 0; x <= W; x += gridSize) {
      lines.push(<Line key={`v${x}`} points={[x, 0, x, H]} stroke="#e2e8f0" strokeWidth={0.5} />);
    }
    for (let y = 0; y <= H; y += gridSize) {
      lines.push(<Line key={`h${y}`} points={[0, y, W, y]} stroke="#e2e8f0" strokeWidth={0.5} />);
    }

    const major = Math.round(pxPerM * 5); // 5 meter major lines
    for (let x = 0; x <= W; x += major) {
      lines.push(<Line key={`mv${x}`} points={[x, 0, x, H]} stroke="#cbd5e1" strokeWidth={1} />);
    }
    for (let y = 0; y <= H; y += major) {
      lines.push(<Line key={`mh${y}`} points={[0, y, W, y]} stroke="#cbd5e1" strokeWidth={1} />);
    }
    lines.push(<Rect key="boundary" x={0} y={0} width={W} height={H} stroke="#94a3b8" strokeWidth={2} fill="transparent" dash={[8, 4]} />);

    return <Layer listening={false}>{lines}</Layer>;
  };

  const allShapes = [...shapes, newShape].filter(Boolean) as EditorShape[];
  const isPanningActive = tool === 'pan' || isSpacePanning || isMiddlePanning;

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-200 select-none relative overflow-hidden">
      <Stage
        ref={stageRef}
        width={containerSize.w}
        height={containerSize.h}
        onWheel={handleWheel}
        onMouseDown={(e: KonvaEventObject<MouseEvent>) => {
          // Middle mouse button (button === 1) → activate pan regardless of current tool
          if (e.evt.button === 1) {
            e.evt.preventDefault();
            setIsMiddlePanning(true);
            return;
          }
          handleMouseDown(e);
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={(e: KonvaEventObject<MouseEvent>) => {
          if (e.evt.button === 1) {
            setIsMiddlePanning(false);
            return;
          }
          handleMouseUp(e);
        }}
        onDblClick={() => {
          if (tool === 'polygon' && polygonDraftPoints.length >= 6) {
            finishPolygon();
          }
        }}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={isPanningActive}
        style={{ cursor: isPanningActive ? 'grab' : (tool === 'select' ? 'default' : 'crosshair') }}
      >
        {/* Layer 0: Grid */}
        {renderGrid()}

        {/* Layer 0.5: Reference Floor-Plan Image (Separate from authoritative geometry) */}
        {layers.floorplanImage && bgImage && (
          <Layer listening={false}>
            <KonvaImage
              image={bgImage}
              x={overlayConfig?.offsetX ?? 0}
              y={overlayConfig?.offsetY ?? 0}
              scaleX={overlayConfig?.scaleX ?? 1}
              scaleY={overlayConfig?.scaleY ?? 1}
              rotation={overlayConfig?.rotationDegrees ?? 0}
              opacity={overlayConfig?.opacity ?? 0.65}
            />
          </Layer>
        )}

        {/* Layer 1: Objects, Rooms, and Door Link Indicators */}
        {layers.objects && (
          <Layer>
            {/* Visual linkage lines from rooms to their associated door nodes */}
            {shapes.map(shape => {
              const doorNodeId = shape.attributes?.associatedNodeId;
              if (!doorNodeId) return null;
              const doorNode = nodeMap.get(doorNodeId);
              if (!doorNode) return null;

              const isSelected = selectedIds.includes(shape.id);
              const roomCenterX = shape.x + (shape.width || 20) / 2;
              const roomCenterY = shape.y + (shape.height || 20) / 2;

              return (
                <Group key={`doorlink_${shape.id}`}>
                  <Line
                    points={[roomCenterX, roomCenterY, doorNode.coordinates.x, doorNode.coordinates.y]}
                    stroke={isSelected ? '#2563eb' : '#f59e0b'}
                    strokeWidth={isSelected ? 2 : 1.5}
                    dash={[4, 4]}
                    opacity={isSelected ? 0.9 : 0.6}
                  />
                  {isSelected && (
                    <Circle
                      x={(roomCenterX + doorNode.coordinates.x) / 2}
                      y={(roomCenterY + doorNode.coordinates.y) / 2}
                      radius={3}
                      fill="#2563eb"
                    />
                  )}
                </Group>
              );
            })}

            {/* Vector Shapes */}
            {allShapes.map(shape => {
              const isSelected = selectedIds.includes(shape.id);
              const isDraft = shape.id.startsWith('draft_');
              const objIssue = layers.validationWarnings
                ? (warningObjectIssues.get(shape.objectId || '') || warningObjectIssues.get(shape.id))
                : undefined;
              const strokeColor = isSelected
                ? '#2563eb'
                : objIssue
                ? (objIssue.type === 'error' ? '#ef4444' : '#f59e0b')
                : shape.color;
              const strokeW = isSelected ? 3 : objIssue ? 2.5 : 2;
              const dashPattern = isDraft ? [6, 4] : objIssue ? [5, 3] : [];

              if (shape.geometryType === 'polygon') {
                const hasCustomVertices = shape.points && shape.points.length > 4;
                return (
                  <Group key={shape.id}>
                    {hasCustomVertices ? (
                      <Line
                        id={shape.id}
                        x={shape.x}
                        y={shape.y}
                        points={shape.points.map((p, i) => (i % 2 === 0 ? p - shape.x : p - shape.y))}
                        closed={true}
                        fill={`${shape.color}25`}
                        stroke={isDraft ? '#94a3b8' : strokeColor}
                        strokeWidth={strokeW}
                        dash={dashPattern}
                        draggable={tool === 'select' && isSelected && !isDraft}
                        onDragEnd={handleDragEnd}
                        onTransformEnd={handleTransformEnd}
                        onClick={(e) => !isDraft && handleShapeClick(shape.id, e)}
                        rotation={shape.rotation}
                      />
                    ) : (
                      <Rect
                        id={shape.id}
                        x={shape.x} y={shape.y}
                        width={shape.width || 10} height={shape.height || 10}
                        fill={`${shape.color}25`}
                        stroke={isDraft ? '#94a3b8' : strokeColor}
                        strokeWidth={strokeW}
                        dash={dashPattern}
                        draggable={tool === 'select' && isSelected && !isDraft}
                        onDragEnd={handleDragEnd}
                        onTransformEnd={handleTransformEnd}
                        onClick={(e) => !isDraft && handleShapeClick(shape.id, e)}
                        rotation={shape.rotation}
                        cornerRadius={2}
                      />
                    )}
                    {!isDraft && (
                      <Group x={shape.x + 4} y={shape.y - 15}>
                        <Rect
                          width={shape.name.length * 6.5 + (objIssue ? 26 : 8)}
                          height={14}
                          fill="rgba(255,255,255,0.9)"
                          cornerRadius={3}
                          stroke={objIssue ? (objIssue.type === 'error' ? '#ef4444' : '#f59e0b') : 'transparent'}
                          strokeWidth={objIssue ? 1 : 0}
                        />
                        <Text x={4} y={2} text={shape.name} fontSize={10} fill={shape.color} fontStyle="bold" />
                        {objIssue && (
                          <Text
                            x={shape.name.length * 6.5 + 8}
                            y={2}
                            text="⚠"
                            fontSize={10}
                            fill={objIssue.type === 'error' ? '#ef4444' : '#f59e0b'}
                            fontStyle="bold"
                          />
                        )}
                      </Group>
                    )}
                  </Group>
                );
              }

              if (shape.geometryType === 'circle' || shape.geometryType === 'ellipse') {
                const rx = (shape.width || 10) / 2;
                const ry = (shape.height || 10) / 2;
                return (
                  <Group key={shape.id}>
                    <Ellipse
                      id={shape.id}
                      x={shape.x + rx}
                      y={shape.y + ry}
                      radiusX={rx}
                      radiusY={ry}
                      fill={`${shape.color}25`}
                      stroke={isDraft ? '#94a3b8' : strokeColor}
                      strokeWidth={strokeW}
                      dash={isDraft ? [6, 4] : []}
                      draggable={tool === 'select' && isSelected && !isDraft}
                      onDragEnd={(e) => {
                        const node = e.target;
                        setShapes(prev => prev.map(s => s.id === shape.id ? { ...s, x: snap(node.x() - rx), y: snap(node.y() - ry) } : s));
                      }}
                      onTransformEnd={(e) => {
                        const node = e.target;
                        setShapes(prev => prev.map(s => {
                          if (s.id !== shape.id) return s;
                          const newW = (s.width || 0) * node.scaleX();
                          const newH = (s.height || 0) * node.scaleY();
                          node.scaleX(1); node.scaleY(1);
                          return { ...s, x: snap(node.x() - newW/2), y: snap(node.y() - newH/2), width: newW, height: newH, rotation: node.rotation() };
                        }));
                      }}
                      onClick={(e) => !isDraft && handleShapeClick(shape.id, e)}
                      rotation={shape.rotation}
                    />
                    {!isDraft && (
                      <Text x={shape.x + 4} y={shape.y - 14} text={shape.name} fontSize={10} fill={shape.color} fontStyle="bold" />
                    )}
                  </Group>
                );
              }

              if (shape.geometryType === 'polyline') {
                return (
                  <Line
                    key={shape.id}
                    id={shape.id}
                    points={shape.points}
                    stroke={isDraft ? '#94a3b8' : strokeColor}
                    strokeWidth={strokeW}
                    dash={isDraft ? [8, 5] : []}
                    draggable={tool === 'select' && isSelected && !isDraft}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => !isDraft && handleShapeClick(shape.id, e)}
                    rotation={shape.rotation}
                  />
                );
              }

              if (shape.geometryType === 'point') {
                return (
                  <Group key={shape.id}>
                    <Circle
                      id={shape.id}
                      x={shape.x} y={shape.y}
                      radius={8}
                      fill={shape.color}
                      stroke={isSelected ? '#2563eb' : 'white'}
                      strokeWidth={2}
                      draggable={tool === 'select' && isSelected && !isDraft}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => !isDraft && handleShapeClick(shape.id, e)}
                    />
                    {!isDraft && (
                      <Text x={shape.x + 12} y={shape.y - 5} text={shape.name} fontSize={10} fill={shape.color} fontStyle="bold" />
                    )}
                  </Group>
                );
              }
              return null;
            })}

            {/* Polygon Draft Visualization */}
            {polygonDraftPoints.length > 0 && (
              <Group listening={false}>
                <Line
                  points={[...polygonDraftPoints, snap(mouseCanvasPos.x), snap(mouseCanvasPos.y)]}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dash={[4, 4]}
                />
                {polygonDraftPoints.map((val, idx) => {
                  if (idx % 2 !== 0) return null;
                  const vx = val;
                  const vy = polygonDraftPoints[idx + 1];
                  const isFirst = idx === 0;
                  return (
                    <Circle
                      key={`poly_draft_${idx}`}
                      x={vx}
                      y={vy}
                      radius={isFirst ? 6 : 4}
                      fill={isFirst ? '#2563eb' : '#3b82f6'}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                })}
              </Group>
            )}

            <Transformer
              ref={transformerRef}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
              boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)}
            />
          </Layer>
        )}

        {/* Layer 2: Navigation Edges (Paths) */}
        {layers.edges && (
          <Layer>
            {connections.map(conn => {
              const src = nodeMap.get(conn.sourceNodeId);
              const tgt = nodeMap.get(conn.targetNodeId);
              if (!src || !tgt) return null;

              const isSelected = selectedEdgeId === conn.id;
              const hasWarning = layers.validationWarnings && warningEdgeIds.has(conn.id);
              const isStairs = conn.connectionType === 'staircase';
              const isElevator = conn.connectionType === 'elevator';
              const isDoor = conn.connectionType === 'door';

              const strokeColor = isSelected
                ? '#2563eb'
                : hasWarning
                ? '#f59e0b'
                : isStairs
                ? '#8b5cf6'
                : isElevator
                ? '#10b981'
                : isDoor
                ? '#f59e0b'
                : '#64748b';
              const strokeW = isSelected ? 4 : isStairs || isElevator ? 3 : 2.5;

              return (
                <Group key={conn.id} onClick={() => {
                  setSelectedIds([]);
                  onNodeSelected?.(null);
                  onEdgeSelected?.(conn);
                }}>
                  {/* Invisible wide hit area for easy clicking */}
                  <Line
                    points={[src.coordinates.x, src.coordinates.y, tgt.coordinates.x, tgt.coordinates.y]}
                    stroke="transparent"
                    strokeWidth={14}
                  />
                  {/* Warning halo */}
                  {hasWarning && (
                    <Line
                      points={[src.coordinates.x, src.coordinates.y, tgt.coordinates.x, tgt.coordinates.y]}
                      stroke="#f59e0b50"
                      strokeWidth={strokeW + 6}
                      lineCap="round"
                    />
                  )}
                  {/* Visual line */}
                  <Line
                    points={[src.coordinates.x, src.coordinates.y, tgt.coordinates.x, tgt.coordinates.y]}
                    stroke={strokeColor}
                    strokeWidth={strokeW}
                    dash={hasWarning ? [5, 3] : isStairs ? [6, 4] : isElevator ? [3, 3] : []}
                    lineCap="round"
                  />
                </Group>
              );
            })}

            {/* Active rubber-band edge during creation */}
            {tool === 'add_edge' && edgeStartNode && (
              <Line
                points={[edgeStartNode.coordinates.x, edgeStartNode.coordinates.y, mouseCanvasPos.x, mouseCanvasPos.y]}
                stroke="#3b82f6"
                strokeWidth={2}
                dash={[4, 4]}
              />
            )}
          </Layer>
        )}

        {/* Layer 3: Navigation Nodes */}
        {layers.nodes && (
          <Layer>
            {nodes.map(node => {
              const isSelected = selectedNodeId === node.id;
              const isEdgeSource = edgeStartNodeId === node.id;
              const hasWarning = layers.validationWarnings && warningNodeIds.has(node.id);
              const nodeColor = NODE_COLORS[node.type] || '#3b82f6';
              const radius = isSelected || isEdgeSource ? 9 : 7;
              const isDoorNode = node.type === 'door';

              return (
                <Group
                  key={node.id}
                  x={node.coordinates.x}
                  y={node.coordinates.y}
                  draggable={tool === 'select'}
                  onDragEnd={(e) => handleNodeDragEnd(node.id, e)}
                  onClick={(e) => handleNodeClick(node, e)}
                >
                  {/* Warning ring */}
                  {hasWarning && (
                    <Circle
                      radius={16}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dash={[4, 3]}
                    />
                  )}

                  {/* Active edge source pulse ring */}
                  {isEdgeSource && (
                    <Circle
                      radius={14}
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                    />
                  )}

                  {/* Selection glow */}
                  {isSelected && (
                    <Circle
                      radius={14}
                      fill="#2563eb30"
                      stroke="#2563eb"
                      strokeWidth={1.5}
                    />
                  )}

                  {/* Main Node Circle / Square for door */}
                  {isDoorNode ? (
                    <Rect
                      x={-radius}
                      y={-radius}
                      width={radius * 2}
                      height={radius * 2}
                      fill={nodeColor}
                      stroke="white"
                      strokeWidth={2}
                      shadowColor="black"
                      shadowBlur={4}
                      shadowOpacity={0.25}
                      cornerRadius={2}
                    />
                  ) : (
                    <Circle
                      radius={radius}
                      fill={nodeColor}
                      stroke="white"
                      strokeWidth={2}
                      shadowColor="black"
                      shadowBlur={4}
                      shadowOpacity={0.25}
                    />
                  )}

                  {/* Node Label */}
                  {node.label && (
                    <Text
                      x={11}
                      y={-6}
                      text={node.label}
                      fontSize={10}
                      fill="#334155"
                      fontStyle="bold"
                    />
                  )}
                </Group>
              );
            })}
          </Layer>
        )}

        {/* Layer 4: Marquee Drag Selection Box */}
        {isMarqueeSelecting && (
          <Layer listening={false}>
            <Rect
              x={Math.min(marqueeStart.x, marqueeCurrent.x)}
              y={Math.min(marqueeStart.y, marqueeCurrent.y)}
              width={Math.abs(marqueeCurrent.x - marqueeStart.x)}
              height={Math.abs(marqueeCurrent.y - marqueeStart.y)}
              fill="rgba(59, 130, 246, 0.15)"
              stroke="#3b82f6"
              strokeWidth={1}
              dash={[4, 2]}
            />
          </Layer>
        )}
      </Stage>

      {/* On-canvas quick View Controls widget in bottom right */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-slate-300 shadow-lg rounded-lg p-1 text-xs">
        <button
          onClick={() => onZoomChange?.(Math.max((zoom || 100) - 15, 25))}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 font-bold"
          title="Zoom Out (-)"
        >
          −
        </button>
        <button
          onClick={() => onZoomChange?.(100)}
          className="px-2 py-1 hover:bg-slate-100 rounded text-slate-700 font-mono text-[11px]"
          title="Reset Zoom to 100% (0)"
        >
          {zoom}%
        </button>
        <button
          onClick={() => onZoomChange?.(Math.min((zoom || 100) + 15, 300))}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 font-bold"
          title="Zoom In (+)"
        >
          +
        </button>
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        <button
          onClick={fitToView}
          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-semibold text-[11px] transition-colors"
          title="Fit All Content to View (F)"
        >
          Fit
        </button>
      </div>
    </div>
  );
};
