import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Line, Ellipse, Transformer, Group, Text, Image as KonvaImage } from 'react-konva';
import { Copy, CopyPlus, Lock, Unlock, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
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
  onToolChange?: (tool: EditorTool) => void;
  gridSize: number;
  isSnapping: boolean;
  onCoordinatesChange: (pt: Point2D) => void;
  activeType: ObjectType | null;
  calibration: MapCalibration;
  onDraftMeasure: (m: DraftMeasure) => void;
  onShapeUpdated?: (shapeId: string, updates: Partial<EditorShape>) => void;
  /** Called whenever the stage scale or position changes, so parent can sync for element drops */
  onViewportChange?: (scale: number, position: { x: number; y: number }) => void;

  // Graph network props
  nodes?: SpatialNode[];
  connections?: CampusConnection[];
  layers?: LayerVisibility;
  activeCampusId?: string;
  activeFloorId?: string;
  activeBuildingId?: string;
  /** When set, editor is in room interior mode — drag bounds are unrestricted */
  isRoomInteriorMode?: boolean;
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
  tool, onToolChange, gridSize, isSnapping, onCoordinatesChange, activeType, calibration, onDraftMeasure, onShapeUpdated,
  nodes = [], connections = [], layers = { floorplanImage: true, nodes: true, edges: true, objects: true, grid: true, validationWarnings: true },
  activeCampusId, activeFloorId, activeBuildingId, 
  onNodeCreated, onNodeUpdated, onNodeSelected, onEdgeCreated, onEdgeSelected,
  selectedNodeId, selectedEdgeId, validationIssues = [],
  zoom = 100, onZoomChange, nodeTypeToCreate = 'hallway',
  floorplanImageUrl, overlayConfig, fitToViewTrigger,
  onViewportChange,
}) => {
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(zoom / 100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  positionRef.current = position;
  const middlePanRef = useRef({ isPanning: false, startX: 0, startY: 0, origPosX: 0, origPosY: 0 });
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

  // Floating Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    shapeId: string;
  } | null>(null);

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('wheel', handleCloseMenu);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('wheel', handleCloseMenu);
    };
  }, []);

  const handleShapeContextMenu = (shapeId: string, e: KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    e.cancelBubble = true;
    setSelectedIds([shapeId]);
    if (onToolChange && tool !== 'select') {
      onToolChange('select');
    }
    setContextMenu({
      x: e.evt.clientX,
      y: e.evt.clientY,
      shapeId,
    });
  };

  const handleContextMenuCopy = () => {
    if (!contextMenu) return;
    const target = shapes.find(s => s.id === contextMenu.shapeId);
    if (target) {
      try {
        navigator.clipboard.writeText(JSON.stringify(target));
      } catch {}
    }
    setContextMenu(null);
  };

  const handleContextMenuDuplicate = () => {
    if (!contextMenu) return;
    const target = shapes.find(s => s.id === contextMenu.shapeId);
    if (target) {
      const wM = pxToMeters(target.width || 60, calibration);
      const hM = pxToMeters(target.height || 40, calibration);
      const newX = target.x + gridSize;
      const newY = target.y + gridSize;
      const dup: EditorShape = {
        ...target,
        id: uuidv4(),
        name: target.name ? `${target.name} (Copy)` : 'Object (Copy)',
        x: newX,
        y: newY,
        realWorld: {
          originXMeters: pxToMeters(newX, calibration),
          originYMeters: pxToMeters(newY, calibration),
          widthMeters: wM,
          heightMeters: hM,
          areaM2: wM * hM,
          rotationDeg: target.rotation,
        },
      };
      setShapes(prev => [...prev, dup]);
      setSelectedIds([dup.id]);
    }
    setContextMenu(null);
  };

  const handleContextMenuToggleLock = () => {
    if (!contextMenu) return;
    const shapeId = contextMenu.shapeId;
    const target = shapes.find(s => s.id === shapeId);
    if (target) {
      const nextLocked = !target.isLocked;
      if (onShapeUpdated) {
        onShapeUpdated(shapeId, { isLocked: nextLocked });
      } else {
        setShapes(prev => prev.map(s => s.id === shapeId ? { ...s, isLocked: nextLocked } : s));
      }
    }
    setContextMenu(null);
  };

  const handleContextMenuBringForward = () => {
    if (!contextMenu) return;
    const shapeId = contextMenu.shapeId;
    setShapes(prev => {
      const idx = prev.findIndex(s => s.id === shapeId);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(idx + 1, 0, item);
      return next;
    });
    setContextMenu(null);
  };

  const handleContextMenuSendBackward = () => {
    if (!contextMenu) return;
    const shapeId = contextMenu.shapeId;
    setShapes(prev => {
      const idx = prev.findIndex(s => s.id === shapeId);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(idx - 1, 0, item);
      return next;
    });
    setContextMenu(null);
  };

  const handleContextMenuDelete = () => {
    if (!contextMenu) return;
    const shapeId = contextMenu.shapeId;
    setShapes(prev => prev.filter(s => s.id !== shapeId));
    setSelectedIds(selectedIds.filter(id => id !== shapeId));
    setContextMenu(null);
  };

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

  // Native capture listeners for middle mouse button scroller hold-and-drag pan
  useEffect(() => {
    const handleNativeMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        middlePanRef.current = {
          isPanning: true,
          startX: e.clientX,
          startY: e.clientY,
          origPosX: positionRef.current.x,
          origPosY: positionRef.current.y,
        };
        setIsMiddlePanning(true);
      }
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (middlePanRef.current.isPanning) {
        e.preventDefault();
        const dx = e.clientX - middlePanRef.current.startX;
        const dy = e.clientY - middlePanRef.current.startY;
        const nextPos = {
          x: middlePanRef.current.origPosX + dx,
          y: middlePanRef.current.origPosY + dy,
        };
        setPosition(nextPos);
        positionRef.current = nextPos;
        if (stageRef.current) {
          stageRef.current.position(nextPos);
          stageRef.current.batchDraw();
        }
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (middlePanRef.current.isPanning && (e.button === 1 || !(e.buttons & 4))) {
        middlePanRef.current.isPanning = false;
        setIsMiddlePanning(false);
      }
    };

    const handleAuxClick = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const el = containerRef.current;
    if (el) {
      el.addEventListener('mousedown', handleNativeMouseDown, { capture: true });
      el.addEventListener('auxclick', handleAuxClick, { capture: true });
    }
    window.addEventListener('mousemove', handleWindowMouseMove, { passive: false });
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      if (el) {
        el.removeEventListener('mousedown', handleNativeMouseDown, { capture: true } as any);
        el.removeEventListener('auxclick', handleAuxClick, { capture: true } as any);
      }
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, []);

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

  // Keep fitToView ref updated so effect doesn't re-trigger on every render / prop change
  const fitToViewRef = useRef(fitToView);
  useEffect(() => {
    fitToViewRef.current = fitToView;
  }, [fitToView]);

  // Trigger fit to view ONLY when fitToViewTrigger explicitly increments
  useEffect(() => {
    if (fitToViewTrigger && fitToViewTrigger > 0) {
      fitToViewRef.current();
    }
  }, [fitToViewTrigger]);

  // Sync transformer to selected shape nodes with double-tick check
  useEffect(() => {
    const updateTransformer = () => {
      if (transformerRef.current && stageRef.current) {
        const konvaNodes = selectedIds.map(id => {
          const s = shapes.find(shape => shape.id === id);
          if (s?.isLocked) return null;
          return stageRef.current.findOne('#' + id) || stageRef.current.findOne((n: any) => n.attrs && n.attrs.id === id);
        }).filter(Boolean);
        transformerRef.current.nodes(konvaNodes);
        transformerRef.current.forceUpdate();
        transformerRef.current.getLayer()?.batchDraw();
      }
    };
    updateTransformer();
    const t = setTimeout(updateTransformer, 40);
    return () => clearTimeout(t);
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
    onViewportChange?.(newScale, { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
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
        const nodeId = uuidv4();
        let targetBuildingId = activeBuildingId;
        let nodeLabel = `${nodeTypeToCreate.charAt(0).toUpperCase() + nodeTypeToCreate.slice(1)} (${Math.round(sp.x)}, ${Math.round(sp.y)})`;

        // If placing an Entrance (Main or Side), auto-detect nearest building and link to it
        if (nodeTypeToCreate === 'entrance' || nodeTypeToCreate === 'outdoor_waypoint') {
          // Find candidates within 220px proximity
          const candidates = shapes.filter(s => {
            const sw = s.width || 80;
            const sh = s.height || 80;
            return sp.x >= s.x - 220 && sp.x <= s.x + sw + 220 && sp.y >= s.y - 220 && sp.y <= s.y + sh + 220;
          });

          // Sort candidates: prioritize building elements, then closest distance
          candidates.sort((a, b) => {
            const aIsBld = a.attributes?.elementCategory === 'building' || /building|block|hall|admin|lab|corp/i.test(a.name);
            const bIsBld = b.attributes?.elementCategory === 'building' || /building|block|hall|admin|lab|corp/i.test(b.name);
            if (aIsBld && !bIsBld) return -1;
            if (!aIsBld && bIsBld) return 1;
            const distA = Math.hypot((a.x + (a.width || 80)/2) - sp.x, (a.y + (a.height || 80)/2) - sp.y);
            const distB = Math.hypot((b.x + (b.width || 80)/2) - sp.x, (b.y + (b.height || 80)/2) - sp.y);
            return distA - distB;
          });

          const nearestShape = candidates[0];

          if (nearestShape) {
            targetBuildingId = nearestShape.objectId || nearestShape.id;
            nodeLabel = nodeTypeToCreate === 'entrance' 
              ? `${nearestShape.name} - Main Entrance`
              : `${nearestShape.name} - Side Entrance`;

            // Auto-bind this entrance door to the building shape
            if (onShapeUpdated) {
              const prevEntrances = nearestShape.attributes?.entranceNodeIds || [];
              onShapeUpdated(nearestShape.id, {
                attributes: {
                  ...nearestShape.attributes,
                  associatedNodeId: nodeId,
                  entranceNodeIds: Array.from(new Set([...prevEntrances, nodeId])),
                }
              });
            }
          } else {
            nodeLabel = nodeTypeToCreate === 'entrance' ? 'Campus Main Entrance Gate' : 'Campus Side Entrance Gate';
          }
        }

        const newNode: SpatialNode = {
          id: nodeId,
          campusId: activeCampusId,
          buildingId: targetBuildingId,
          floorId: activeFloorId,
          type: nodeTypeToCreate,
          coordinates: { x: sp.x, y: sp.y },
          isAccessible: true,
          label: nodeLabel,
        };
        onNodeCreated(newNode);
        onNodeSelected?.(newNode);
        setSelectedIds([]);
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

    // Shape Drawing Tools (allows drawing anywhere across canvas, over elements or empty canvas)
    const isDrawingTool = tool === 'line' || tool === 'wall' || tool === 'path' || tool === 'rectangle' || tool === 'circle' || tool === 'ellipse' || tool === 'point';
    if (isDrawingTool) {
      setIsDrawing(true);
      const geomType = (tool === 'line' || tool === 'wall' || tool === 'path') ? 'polyline' : tool === 'point' ? 'point' : tool === 'circle' ? 'circle' : tool === 'ellipse' ? 'ellipse' : 'polygon';

      const shape: EditorShape = {
        id: `draft_${uuidv4()}`,
        objectTypeId: activeType?.id || 'generic',
        geometryType: geomType,
        points: [sp.x, sp.y, sp.x, sp.y],
        x: sp.x, y: sp.y,
        width: 0, height: 0,
        rotation: 0, scaleX: 1, scaleY: 1,
        name: tool === 'path' ? 'Navigation Path' : tool === 'wall' ? 'Wall Line' : (activeType ? `New ${activeType.name}` : 'New Shape'),
        color: tool === 'path' ? '#94a3b8' : tool === 'wall' ? '#1e293b' : (activeType?.color || '#3b82f6'),
        attributes: tool === 'path' ? { isPath: true } : tool === 'wall' ? { isWall: true } : {},
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
    } else if (tool === 'line' || tool === 'wall' || tool === 'path') {
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
    if (tool === 'line' || tool === 'wall' || tool === 'path') {
      const [x1, y1, x2, y2] = newShape.points;
      if (Math.abs(x2 - x1) < 5 && Math.abs(y2 - y1) < 5) { setNewShape(null); return; }
    }

    const final = { ...newShape, id: uuidv4() };
    onShapeFinalized(final);
    setNewShape(null);
  };

  const handleShapeClick = (shapeId: string, e: KonvaEventObject<MouseEvent>) => {
    // If a drawing tool or non-select tool is active, DO NOT intercept or cancel drawing!
    if (tool !== 'select') {
      return;
    }
    e.cancelBubble = true;

    if (e.evt.shiftKey) {
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

    // Synchronously bind Transformer so resize handles appear INSTANTLY!
    if (stageRef.current && transformerRef.current) {
      const s = shapes.find(shape => shape.id === shapeId);
      if (!s?.isLocked) {
        const node = stageRef.current.findOne('#' + shapeId) || stageRef.current.findOne((n: any) => n.attrs && n.attrs.id === shapeId);
        if (node) {
          transformerRef.current.nodes([node]);
          transformerRef.current.forceUpdate();
          transformerRef.current.getLayer()?.batchDraw();
        }
      } else {
        transformerRef.current.nodes([]);
        transformerRef.current.forceUpdate();
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
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

    const cur = shapes.find(s => s.id === id);
    const dx = cur ? newX - cur.x : 0;
    const dy = cur ? newY - cur.y : 0;
    const updatedPoints: number[] = cur && cur.points ? cur.points.map((p, i) => i % 2 === 0 ? p + dx : p + dy) : (cur?.points || []);

    if (onShapeUpdated) {
      onShapeUpdated(id, {
        x: newX,
        y: newY,
        points: updatedPoints,
      });
    } else {
      setShapes(prev => prev.map(s => {
        if (s.id !== id) return s;
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
    }
  };

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    let node = e.target as any;
    if (node.nodes && typeof node.nodes === 'function' && node.nodes().length > 0) {
      node = node.nodes()[0];
    } else if (typeof node.getNode === 'function' && !node.id()) {
      node = node.getNode() || node;
    }
    const id = (typeof node.id === 'function' ? node.id() : node.id) || (selectedIds.length === 1 ? selectedIds[0] : '');
    if (!id) return;

    const scaleX = typeof node.scaleX === 'function' ? node.scaleX() : 1;
    const scaleY = typeof node.scaleY === 'function' ? node.scaleY() : 1;
    const absScaleX = Math.abs(scaleX);
    const absScaleY = Math.abs(scaleY);
    const newX = Math.max(0, snap(node.x()));
    const newY = Math.max(0, snap(node.y()));
    const rot = Math.round(node.rotation ? node.rotation() : 0);

    const currentShape = shapes.find(s => s.id === id);
    let newW = currentShape?.width || 60;
    let newH = currentShape?.height || 40;

    // Apply dimensions directly to the Konva node so it does not snap back!
    if (typeof node.width === 'function' && typeof node.height === 'function') {
      const curW = node.width();
      const curH = node.height();
      newW = Math.max(5, Math.round(curW * absScaleX));
      newH = Math.max(5, Math.round(curH * absScaleY));
      node.width(newW);
      node.height(newH);
    } else if (typeof node.radius === 'function') {
      const curR = node.radius();
      const avgScale = Math.max(absScaleX, absScaleY);
      const newR = Math.max(4, Math.round(curR * avgScale));
      node.radius(newR);
      newW = newR * 2;
      newH = newR * 2;
    } else if (typeof node.radiusX === 'function' && typeof node.radiusY === 'function') {
      const newRx = Math.max(4, Math.round(node.radiusX() * absScaleX));
      const newRy = Math.max(4, Math.round(node.radiusY() * absScaleY));
      node.radiusX(newRx);
      node.radiusY(newRy);
      newW = newRx * 2;
      newH = newRy * 2;
    }

    // Reset scale to 1 on node
    node.scaleX(1);
    node.scaleY(1);
    node.x(newX);
    node.y(newY);
    node.rotation(rot);

    if (transformerRef.current) {
      transformerRef.current.forceUpdate();
      transformerRef.current.getLayer()?.batchDraw();
    }

    let updatedPoints: number[] = currentShape?.points || [];
    if (currentShape && currentShape.points && currentShape.points.length > 4) {
      updatedPoints = currentShape.points.map((p, i) =>
        i % 2 === 0
          ? newX + (p - currentShape.x) * scaleX
          : newY + (p - currentShape.y) * scaleY
      );
    }

    if (onShapeUpdated) {
      onShapeUpdated(id, {
        x: newX,
        y: newY,
        width: newW,
        height: newH,
        points: updatedPoints,
        scaleX: 1,
        scaleY: 1,
        rotation: rot,
      });
    } else {
      const wM = pxToMeters(newW, calibration);
      const hM = pxToMeters(newH, calibration);
      const xM = pxToMeters(newX, calibration);
      const yM = pxToMeters(newY, calibration);
      setShapes(prev => prev.map(s => {
        if (s.id !== id) return s;
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
    }

    if (transformerRef.current) {
      transformerRef.current.nodes([node]);
      transformerRef.current.getLayer()?.batchDraw();
    }
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

    // Crisp white canvas background
    lines.push(<Rect key="canvas_bg" x={0} y={0} width={W} height={H} fill="#ffffff" />);

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
    <div ref={containerRef} onContextMenu={(e) => e.preventDefault()} className="w-full h-full bg-slate-200 select-none relative overflow-hidden">
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
        draggable={isPanningActive && !isMiddlePanning}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            const p = { x: e.target.x(), y: e.target.y() };
            setPosition(p);
            positionRef.current = p;
            onViewportChange?.(scale, p);
          }
        }}
        style={{ cursor: (isPanningActive || isMiddlePanning) ? 'grabbing' : (tool === 'select' ? 'default' : 'crosshair') }}
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
            {/* Google Maps Path Mode: wash out entire map background and elements */}
            {tool === 'path' && (
              <Rect
                x={-10000}
                y={-10000}
                width={30000}
                height={30000}
                fill="rgba(255, 255, 255, 0.5)"
                listening={false}
              />
            )}
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
                <Group key={`doorlink_${shape.id}`} listening={false}>
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
                        opacity={tool === 'path' ? 0.35 : 1}
                        stroke={isDraft ? '#94a3b8' : strokeColor}
                        strokeWidth={strokeW}
                        dash={dashPattern}
                        draggable={tool === 'select' && !isDraft && !shape.isLocked}
                        
                        listening={tool === 'select' || (!shape.isLocked && !shape.attributes?.isRoomPerimeter)}
                        onMouseDown={(e) => {
                          if (tool === 'select' && !isDraft && !shape.isLocked) {
                            handleShapeClick(shape.id, e);
                          }
                        }}
                        onDragStart={(e) => {
                          if (!isSelected && tool === 'select') {
                            handleShapeClick(shape.id, e);
                          }
                        }}
                        onDragEnd={handleDragEnd}
                        onTransformEnd={handleTransformEnd}
                        onClick={(e) => !isDraft && handleShapeClick(shape.id, e)}
                        onContextMenu={(e) => !isDraft && handleShapeContextMenu(shape.id, e)}
                        rotation={shape.rotation}
                      />
                    ) : (
                      <Rect
                        id={shape.id}
                        x={shape.x} y={shape.y}
                        width={shape.width || 10} height={shape.height || 10}
                        fill={`${shape.color}25`}
                        opacity={tool === 'path' ? 0.35 : 1}
                        stroke={isDraft ? '#94a3b8' : strokeColor}
                        strokeWidth={strokeW}
                        dash={dashPattern}
                        draggable={tool === 'select' && !isDraft && !shape.isLocked}
                        
                        listening={tool === 'select' || (!shape.isLocked && !shape.attributes?.isRoomPerimeter)}
                        onMouseDown={(e) => {
                          if (tool === 'select' && !isDraft && !shape.isLocked) {
                            handleShapeClick(shape.id, e);
                          }
                        }}
                        onDragStart={(e) => {
                          if (!isSelected && tool === 'select') {
                            handleShapeClick(shape.id, e);
                          }
                        }}
                        onDragEnd={handleDragEnd}
                        onTransformEnd={handleTransformEnd}
                        onClick={(e) => !isDraft && handleShapeClick(shape.id, e)}
                        onContextMenu={(e) => !isDraft && handleShapeContextMenu(shape.id, e)}
                        rotation={shape.rotation}
                        cornerRadius={2}
                      />
                    )}
                    {!isDraft && (
                      <Group x={shape.x + 4} y={shape.y - 15} listening={false}>
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
                      onTransformEnd={handleTransformEnd}
                      onClick={(e) => !isDraft && handleShapeClick(shape.id, e)}
                        onContextMenu={(e) => !isDraft && handleShapeContextMenu(shape.id, e)}
                      rotation={shape.rotation}
                    />
                    {!isDraft && (
                      <Text x={shape.x + 4} y={shape.y - 14} text={shape.name} fontSize={10} fill={shape.color} fontStyle="bold" />
                    )}
                  </Group>
                );
              }

              if (shape.geometryType === 'polyline') {
                const isRoad = shape.name.toLowerCase().includes('road') || shape.elementKey?.startsWith('road') || shape.attributes?.isRoad;
                const isNavPath = shape.attributes?.isPath === true;
                const isWallLine = shape.attributes?.isWall === true;
                return (
                  <Group key={shape.id}>
                    {/* If road: render asphalt road base with curbs and dashed yellow center line */}
                    {isNavPath ? (
                      <>
                        {/* Google Maps style grey navigation path */}
                        <Line
                          id={shape.id}
                          points={shape.points}
                          stroke="rgba(148,163,184,0.85)"
                          strokeWidth={8}
                          lineCap="round"
                          lineJoin="round"
                          tension={0.3}
                          opacity={0.75}
                          draggable={tool === 'select' && !isDraft}
                          onMouseDown={(e) => {
                            if (tool === 'select' && !isDraft) handleShapeClick(shape.id, e);
                          }}
                          onDragStart={(e) => {
                            if (!isSelected && tool === 'select') handleShapeClick(shape.id, e);
                          }}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => !isDraft && handleShapeClick(shape.id, e)}
                          onContextMenu={(e) => !isDraft && handleShapeContextMenu(shape.id, e)}
                        />
                        {/* Path center line (lighter) */}
                        <Line
                          points={shape.points}
                          stroke="rgba(203,213,225,0.6)"
                          strokeWidth={3}
                          lineCap="round"
                          lineJoin="round"
                          tension={0.3}
                          listening={false}
                        />
                      </>
                    ) : isWallLine ? (
                      <Line
                        id={shape.id}
                        points={shape.points}
                        stroke="#1e293b"
                        strokeWidth={5}
                        lineCap="square"
                        lineJoin="miter"
                        tension={0}
                        draggable={tool === 'select' && !isDraft}
                        onMouseDown={(e) => {
                          if (tool === 'select' && !isDraft) handleShapeClick(shape.id, e);
                        }}
                        onDragStart={(e) => {
                          if (!isSelected && tool === 'select') handleShapeClick(shape.id, e);
                        }}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => !isDraft && handleShapeClick(shape.id, e)}
                        onContextMenu={(e) => !isDraft && handleShapeContextMenu(shape.id, e)}
                      />
                    ) : isRoad ? (
                      <>
                        {/* Outer Curbs */}
                        <Line
                          points={shape.points}
                          stroke="#9ca3af"
                          opacity={tool === 'path' ? 0.35 : 1}
                          strokeWidth={28}
                          lineCap="round"
                          lineJoin="round"
                          tension={0.3}
                        />
                        {/* Asphalt Body */}
                        <Line
                          id={shape.id}
                          points={shape.points}
                          stroke="#374151"
                          opacity={tool === 'path' ? 0.35 : 1}
                          strokeWidth={24}
                          lineCap="round"
                          lineJoin="round"
                          tension={0.3}
                          draggable={tool === 'select' && !isDraft}
                          onMouseDown={(e) => {
                            if (tool === 'select' && !isDraft) handleShapeClick(shape.id, e);
                          }}
                          onDragStart={(e) => {
                            if (!isSelected && tool === 'select') handleShapeClick(shape.id, e);
                          }}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => !isDraft && handleShapeClick(shape.id, e)}
                        onContextMenu={(e) => !isDraft && handleShapeContextMenu(shape.id, e)}
                        />
                        {/* Yellow Dashed Center Line */}
                        <Line
                          points={shape.points}
                          stroke="#facc15"
                          strokeWidth={2.5}
                          dash={[10, 8]}
                          lineCap="round"
                          lineJoin="round"
                          tension={0.3}
                          listening={false}
                        />
                      </>
                    ) : (
                      <Line
                        key={shape.id}
                        id={shape.id}
                        points={shape.points}
                        stroke={isDraft ? '#94a3b8' : strokeColor}
                        strokeWidth={strokeW}
                        dash={isDraft ? [8, 5] : []}
                        draggable={tool === 'select' && !isDraft}
                        onMouseDown={(e) => {
                          if (tool === 'select' && !isDraft) handleShapeClick(shape.id, e);
                        }}
                        onDragStart={(e) => {
                          if (!isSelected && tool === 'select') handleShapeClick(shape.id, e);
                        }}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => !isDraft && handleShapeClick(shape.id, e)}
                        onContextMenu={(e) => !isDraft && handleShapeContextMenu(shape.id, e)}
                        rotation={shape.rotation}
                      />
                    )}

                    {/* Interactive Vertex Bend Handles when Selected */}
                    {isSelected && !isDraft && shape.points && shape.points.length >= 4 && (
                      <Group>
                        {/* Vertex Drag Handles (bend the road) */}
                        {shape.points.map((val, idx) => {
                          if (idx % 2 !== 0) return null;
                          const ptX = val;
                          const ptY = shape.points[idx + 1];
                          const ptIndex = idx;
                          return (
                            <Circle
                              key={`handle_${shape.id}_${idx}`}
                              x={ptX}
                              y={ptY}
                              radius={6}
                              fill="#2563eb"
                              stroke="#ffffff"
                              strokeWidth={2}
                              draggable
                              onDragMove={(e) => {
                                const newX = snap(e.target.x());
                                const newY = snap(e.target.y());
                                const nextPts = [...shape.points];
                                nextPts[ptIndex] = newX;
                                nextPts[ptIndex + 1] = newY;
                                if (onShapeUpdated) {
                                  onShapeUpdated(shape.id, { points: nextPts });
                                }
                              }}
                            />
                          );
                        })}
                      </Group>
                    )}
                  </Group>
                );
              }

              if (shape.geometryType === 'point') {
                return (
                  <Group key={shape.id}>
                    <Circle
                      id={shape.id}
                      x={shape.x} y={shape.y}
                      radius={shape.width ? shape.width / 2 : 8}
                      fill={shape.color}
                      stroke={isSelected ? '#2563eb' : 'white'}
                      strokeWidth={2}
                      draggable={tool === 'select' && isSelected && !isDraft}
                      onDragEnd={handleDragEnd}
                      onTransformEnd={handleTransformEnd}
                      onClick={(e) => !isDraft && handleShapeClick(shape.id, e)}
                        onContextMenu={(e) => !isDraft && handleShapeContextMenu(shape.id, e)}
                    />
                    {!isDraft && (
                      <Text x={shape.x + 12} y={shape.y - 5} text={shape.name} fontSize={10} fill={shape.color} fontStyle="bold" />
                    )}
                  </Group>
                );
              }
              // ── Image / Preset Element shape ──────────────────────────────
              if (shape.geometryType === 'image' && shape.elementDataUrl) {
                return (
                  <ImageShape
                    key={shape.id}
                    shape={shape}
                    isSelected={isSelected}
                    tool={tool}
                                        onDragEnd={handleDragEnd}
                    onTransformEnd={handleTransformEnd}
                    onShapeClick={handleShapeClick}
                    onContextMenu={handleShapeContextMenu}
                  />
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
              enabledAnchors={[
                'top-left', 'top-center', 'top-right',
                'middle-right', 'middle-left',
                'bottom-left', 'bottom-center', 'bottom-right'
              ]}
              rotateEnabled={true}
              rotateAnchorOffset={24}
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              anchorSize={8}
              anchorCornerRadius={2}
              borderStroke="#2563eb"
              borderStrokeWidth={1.5}
              borderDash={[4, 4]}
              anchorStroke="#2563eb"
              anchorFill="#ffffff"
              boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5 ? oldBox : newBox)}
              onTransformEnd={handleTransformEnd}
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
                  draggable={true}
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

                  {/* Main Node Rendering: Location Pin Symbol for Entrances */}
                  {node.type === 'entrance' || node.type === 'outdoor_waypoint' ? (
                    <Group y={-6}>
                      {/* Teardrop Location Pin Marker */}
                      <Circle
                        y={-6}
                        radius={10}
                        fill={node.type === 'entrance' ? '#ef4444' : '#f97316'}
                        stroke="#ffffff"
                        strokeWidth={2.5}
                        shadowColor="black"
                        shadowBlur={5}
                        shadowOpacity={0.35}
                      />
                      {/* Downward Pointer Pin Tip */}
                      <Line
                        points={[-5, -2, 0, 6, 5, -2]}
                        closed={true}
                        fill={node.type === 'entrance' ? '#ef4444' : '#f97316'}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                      {/* Inner Pin Dot */}
                      <Circle
                        y={-6}
                        radius={3.5}
                        fill="#ffffff"
                      />
                    </Group>
                  ) : isDoorNode ? (
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
      {/* Floating Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{ left: contextMenu.x, top: contextMenu.y }}
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 min-w-[190px] text-xs font-medium text-slate-700 animate-in fade-in zoom-in-95 duration-100 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Copy */}
          <button
            onClick={handleContextMenuCopy}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left"
          >
            <Copy size={14} className="text-slate-500" />
            <span>Copy</span>
          </button>

          {/* Duplicate */}
          <button
            onClick={handleContextMenuDuplicate}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left"
          >
            <CopyPlus size={14} className="text-blue-500" />
            <span>Duplicate</span>
          </button>

          <div className="h-px bg-slate-100 my-1" />

          {/* Lock / Unlock */}
          <button
            onClick={handleContextMenuToggleLock}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left"
          >
            {shapes.find(s => s.id === contextMenu.shapeId)?.isLocked ? (
              <>
                <Unlock size={14} className="text-amber-500" />
                <span>Unlock Element</span>
              </>
            ) : (
              <>
                <Lock size={14} className="text-slate-500" />
                <span>Lock Element</span>
              </>
            )}
          </button>

          <div className="h-px bg-slate-100 my-1" />

          {/* Bring Forward */}
          <button
            onClick={handleContextMenuBringForward}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left"
          >
            <ArrowUp size={14} className="text-slate-500" />
            <span>Bring Forward</span>
          </button>

          {/* Send Backward */}
          <button
            onClick={handleContextMenuSendBackward}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left"
          >
            <ArrowDown size={14} className="text-slate-500" />
            <span>Send Backward</span>
          </button>

          <div className="h-px bg-slate-100 my-1" />

          {/* Delete */}
          <button
            onClick={handleContextMenuDelete}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 text-red-600 transition-colors text-left"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
 * ImageShape - renders a preset element SVG image on the canvas
 * Uses synchronous in-memory cached HTMLImageElements so KonvaImage is immediately
 * mounted and Transformer handles attach without any delay.
 * ────────────────────────────────────────────────────────────────────────── */
const IMAGE_DOM_CACHE = new Map<string, HTMLImageElement>();

function getOrCreateImage(url?: string): HTMLImageElement | null {
  if (!url) return null;
  if (IMAGE_DOM_CACHE.has(url)) {
    return IMAGE_DOM_CACHE.get(url)!;
  }
  const img = new window.Image();
  img.src = url;
  IMAGE_DOM_CACHE.set(url, img);
  return img;
}

interface ImageShapeProps {
  shape: EditorShape;
  isSelected: boolean;
  tool: EditorTool;
  onToolChange?: (tool: EditorTool) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: KonvaEventObject<Event>) => void;
  onShapeClick: (id: string, e: KonvaEventObject<MouseEvent>) => void;
  onContextMenu: (id: string, e: KonvaEventObject<MouseEvent>) => void;
}

const ImageShape: React.FC<ImageShapeProps> = ({
  shape, isSelected, tool, onDragEnd, onTransformEnd, onShapeClick, onContextMenu,
}) => {
  const [imgEl, setImgEl] = React.useState<HTMLImageElement | null>(() => getOrCreateImage(shape.elementDataUrl));

  React.useEffect(() => {
    if (!shape.elementDataUrl) return;
    const img = getOrCreateImage(shape.elementDataUrl);
    if (img) {
      if (img.complete && img.naturalWidth > 0) {
        setImgEl(img);
      } else {
        img.onload = () => setImgEl(img);
      }
    }
  }, [shape.elementDataUrl]);

  if (!imgEl) return null;

  const w = shape.width || 120;
  const h = shape.height || 100;
  const rot = shape.rotation || 0;
  const isLocked = Boolean(shape.isLocked);

  return (
    <Group key={shape.id}>
      <KonvaImage
        id={shape.id}
        name="canvas-shape"
        image={imgEl}
        x={shape.x}
        y={shape.y}
        width={w}
        height={h}
        rotation={rot}
        draggable={tool === 'select' && !isLocked}
        
        listening={tool === 'select'}
        onMouseDown={(e) => {
          if (tool === 'select') onShapeClick(shape.id, e);
        }}
        onDragStart={(e) => {
          if (tool === 'select' && !isSelected) {
            onShapeClick(shape.id, e as any);
          }
        }}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
        onClick={(e) => {
          if (tool === 'select') onShapeClick(shape.id, e);
        }}
        onContextMenu={(e) => onContextMenu(shape.id, e)}
        opacity={tool === 'path' ? 0.35 : 1}
        shadowColor={isSelected ? '#2563eb' : 'transparent'}
        shadowBlur={isSelected ? 8 : 0}
        shadowOpacity={0.4}
      />

      {/* ── THE 5 DOT LINES (Dashed Selection Box + 5+ Resize/Rotation Dots) ── */}
      {isSelected && !isLocked && (
        <Group x={shape.x} y={shape.y} rotation={rot} listening={false}>
          {/* Dashed outer box: 5 dot line pattern */}
          <Rect
            x={0}
            y={0}
            width={w}
            height={h}
            stroke="#2563eb"
            strokeWidth={2}
            dash={[5, 4]}
            fill="transparent"
          />
          {/* Top Rotation Stalk line */}
          <Line
            points={[w / 2, 0, w / 2, -22]}
            stroke="#2563eb"
            strokeWidth={1.5}
          />
          {/* Dot 1: Top Rotation Handle Dot */}
          <Circle
            x={w / 2}
            y={-22}
            radius={5.5}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={2}
          />
          {/* Dot 2: Top-Left Corner Dot */}
          <Circle x={0} y={0} radius={5} fill="#ffffff" stroke="#2563eb" strokeWidth={2} />
          {/* Dot 3: Top-Right Corner Dot */}
          <Circle x={w} y={0} radius={5} fill="#ffffff" stroke="#2563eb" strokeWidth={2} />
          {/* Dot 4: Bottom-Right Corner Dot */}
          <Circle x={w} y={h} radius={5} fill="#ffffff" stroke="#2563eb" strokeWidth={2} />
          {/* Dot 5: Bottom-Left Corner Dot */}
          <Circle x={0} y={h} radius={5} fill="#ffffff" stroke="#2563eb" strokeWidth={2} />

          {/* Edge Midpoint Dots for cropping width & height */}
          <Circle x={w / 2} y={0} radius={4} fill="#ffffff" stroke="#2563eb" strokeWidth={1.5} />
          <Circle x={w / 2} y={h} radius={4} fill="#ffffff" stroke="#2563eb" strokeWidth={1.5} />
          <Circle x={0} y={h / 2} radius={4} fill="#ffffff" stroke="#2563eb" strokeWidth={1.5} />
          <Circle x={w} y={h / 2} radius={4} fill="#ffffff" stroke="#2563eb" strokeWidth={1.5} />
        </Group>
      )}

      {/* Locked status outline & badge */}
      {isSelected && isLocked && (
        <Group x={shape.x} y={shape.y} rotation={rot} listening={false}>
          <Rect
            x={0}
            y={0}
            width={w}
            height={h}
            stroke="#f59e0b"
            strokeWidth={2}
            dash={[4, 2]}
            fill="transparent"
          />
          <Group x={w / 2 - 28} y={-18}>
            <Rect width={56} height={16} rx={3} fill="#f59e0b" />
            <Text x={6} y={3} text="🔒 Locked" fontSize={9} fill="#ffffff" fontStyle="bold" />
          </Group>
        </Group>
      )}

      {/* Label (non-blocking for clicks) */}
      <Group x={shape.x + 4} y={shape.y - 15} listening={false}>
        <Rect
          width={shape.name.length * 6.5 + (isLocked ? 20 : 8)}
          height={14}
          fill="rgba(255,255,255,0.92)"
          cornerRadius={3}
        />
        <Text x={4} y={2} text={isLocked ? `🔒 ${shape.name}` : shape.name} fontSize={10} fill={isLocked ? "#d97706" : "#6366f1"} fontStyle="bold" />
      </Group>
    </Group>
  );
};
