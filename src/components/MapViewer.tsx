import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapObject, SpatialNode, EditorShape } from '../types';
import { CampusConnection } from '../types/connection';
import { RouteResult } from '../api/routing.service';
import { Plus, Minus, RotateCcw, Navigation, MapPin, X, Check } from 'lucide-react';

export interface MapViewerProps {
  objects: MapObject[];
  nodes: SpatialNode[];
  connections?: CampusConnection[];
  routeResult?: RouteResult | null;
  currentFloorId?: string;
  sourceObj?: MapObject | null;
  destObj?: MapObject | null;
  width?: number;
  height?: number;
  onObjectClick?: (obj: MapObject) => void;
  onSelectAsSource?: (obj: MapObject) => void;
  onSelectAsDestination?: (obj: MapObject) => void;
  shapes?: EditorShape[];
  onShapeClick?: (shape: EditorShape) => void;
  isRoomView?: boolean;
  isCampusView?: boolean;
  pickMode?: 'start' | 'dest' | null;
  onCanvasPick?: (coords: { x: number; y: number }, shape?: EditorShape, obj?: MapObject) => void;
  pinPositions?: { source?: { x: number; y: number }; dest?: { x: number; y: number } };
  /** Campus entrance node positions projected into the active floor plan. */
  floorEntrancePositions?: Record<string, { x: number; y: number }>;
  onPinDrag?: (which: 'source' | 'dest', newCanvasCoords: { x: number; y: number }) => void;
}

export const MapViewer: React.FC<MapViewerProps> = ({ 
  objects, 
  nodes, 
  connections = [],
  routeResult, 
  currentFloorId,
  sourceObj,
  destObj,
  width: initialWidth = 900, 
  height: initialHeight = 650,
  onObjectClick,
  onSelectAsSource,
  onSelectAsDestination,
  shapes = [],
  onShapeClick,
  isRoomView = false,
  isCampusView = false,
  pickMode = null,
  onCanvasPick,
  pinPositions,
  floorEntrancePositions = {},
  onPinDrag,
}) => {
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [, setTriggerRender] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [dimensions, setDimensions] = useState({ width: initialWidth, height: initialHeight });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedObj, setSelectedObj] = useState<MapObject | null>(null);
  const [draggingPin, setDraggingPin] = useState<'source' | 'dest' | null>(null);
  const wasPinDraggingRef = useRef(false);
  const [dragPinOffset, setDragPinOffset] = useState({ x: 0, y: 0 });

  // Resize canvas when container size changes
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({
            width: Math.floor(rect.width),
            height: Math.floor(rect.height),
          });
        }
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoom = (factor: number) => {
    setZoom(prev => Math.min(Math.max(0.5, prev * factor), 4));
  };

  // Dynamic canvas bounds matching room boundary shape or default 1200x960
  const canvasBounds = React.useMemo(() => {
    const roomBoundary = shapes.find(s => s.attributes?.isRoomPerimeter || s.objectTypeId === 'room_boundary');
    if (roomBoundary && roomBoundary.width && roomBoundary.height) {
      return { width: roomBoundary.width, height: roomBoundary.height };
    }
    return { width: 1200, height: 960 };
  }, [shapes]);

  // Convert map coordinates to screen coordinates with 1:1 uniform scale matching Map Editor
  const toScreenCoords = useCallback((coord: { x: number; y: number }) => {
    // If viewing fallback mock data with no custom editor shapes, coordinates <= 100 are meters (1m = 12px)
    // If custom editor shapes exist, coordinates are always in 1200 x 960 canvas pixels
    const hasCustomShapes = Boolean(shapes && shapes.length > 0);
    const isMeters = !hasCustomShapes && coord.x <= 100 && coord.y <= 100;
    const pxX = isMeters ? coord.x * 12 : coord.x;
    const pxY = isMeters ? coord.y * 12 : coord.y;

    // Uniform 1:1 scale factor so 1200 x 960 canvas fits within container with padding
    const fitScale = Math.min((dimensions.width - 40) / 1200, (dimensions.height - 40) / 960);
    const totalScale = fitScale * zoom;

    const offsetX = (dimensions.width - 1200 * totalScale) / 2;
    const offsetY = (dimensions.height - 960 * totalScale) / 2;

    return {
      x: offsetX + pxX * totalScale + pan.x,
      y: offsetY + pxY * totalScale + pan.y,
    };
  }, [dimensions, zoom, pan, shapes]);

  // Convert canvas editor pixel coordinates (1200 x 960) to screen coordinates
  const shapeToScreen = useCallback((x: number, y: number) => {
    const fitScale = Math.min((dimensions.width - 40) / 1200, (dimensions.height - 40) / 960);
    const totalScale = fitScale * zoom;

    const offsetX = (dimensions.width - 1200 * totalScale) / 2;
    const offsetY = (dimensions.height - 960 * totalScale) / 2;

    return {
      x: offsetX + x * totalScale + pan.x,
      y: offsetY + y * totalScale + pan.y,
    };
  }, [dimensions, zoom, pan]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Floor area background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridSize = 40 * zoom;
    const offsetX = (pan.x % gridSize);
    const offsetY = (pan.y % gridSize);

    for (let x = offsetX; x <= width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = offsetY; y <= height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.restore();

    // A campus view must never reuse the last floor's coordinate space.  This
    // matters while React is changing views because floor coordinates are not
    // meaningful on the campus plan.
    const viewingCampus = isCampusView || !currentFloorId;
    const floorObjects = viewingCampus ? objects.filter(o => !o.floorId) : objects.filter(o => o.floorId === currentFloorId);
    const floorNodes = viewingCampus ? nodes.filter(n => !n.floorId) : nodes.filter(n => n.floorId === currentFloorId);
    const floorNodeMap = new Map(floorNodes.map(n => [n.id, n]));

    // 0. Draw Map Editor Shapes & 2D Preset Elements (Buildings, Roads, Lawns, Walls, Gates, Trees, Turf)
    if (shapes && shapes.length > 0) {
      ctx.save();
      shapes.forEach(shape => {
        const p1 = shapeToScreen(shape.x, shape.y);
        const fitScale = Math.min((dimensions.width - 40) / 1200, (dimensions.height - 40) / 960);
        const sw = (shape.width || 60) * fitScale * zoom;
        const sh = (shape.height || 60) * fitScale * zoom;

        // A. Image / 2D Preset Element (buildings, trees, gates, fences, turf)
        if (shape.geometryType === 'image' && shape.elementDataUrl) {
          let img = imageCacheRef.current.get(shape.elementDataUrl);
          if (!img) {
            img = new Image();
            img.src = shape.elementDataUrl;
            img.onload = () => setTriggerRender(v => v + 1);
            imageCacheRef.current.set(shape.elementDataUrl, img);
          }

          if (img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.translate(p1.x, p1.y);
            if (shape.rotation) {
              ctx.rotate((shape.rotation * Math.PI) / 180);
            }
            ctx.drawImage(img, 0, 0, sw, sh);
            ctx.restore();
          }

          // Building Name Tag on Campus Map
          const isBld = shape.objectTypeId === 'building' ||
            shape.name.toLowerCase().includes('block') ||
            shape.name.toLowerCase().includes('building') ||
            shape.name.toLowerCase().includes('hall') ||
            shape.name.toLowerCase().includes('lab') ||
            shape.name.toLowerCase().includes('arena') ||
            shape.name.toLowerCase().includes('center') ||
            shape.name.toLowerCase().includes('auditorium') ||
            shape.attributes?.isBuilding;

          if (isBld && shape.name && (!currentFloorId || isCampusView)) {
            ctx.save();
            const tagText = shape.name;
            ctx.font = `600 ${Math.max(11 * zoom, 9)}px Inter, sans-serif`;
            const tagTw = ctx.measureText(tagText).width;
            const tagW = tagTw + 22;
            const tagH = 20;
            const tagX = p1.x + sw / 2 - tagW / 2;
            const tagY = p1.y - tagH - 4;

            ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 2;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.roundRect(tagX, tagY, tagW, tagH, 10);
            ctx.fill();

            ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#4f46e5';
            ctx.beginPath();
            ctx.arc(tagX + 8, tagY + tagH / 2, 3, 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(tagText, tagX + 15, tagY + tagH / 2);
            ctx.restore();
          }
          return;
        }

        // B. Polylines: Roads, Google Maps Navigation Paths, Wall Lines
        if (shape.geometryType === 'polyline' && shape.points && shape.points.length >= 4) {
          const isRoad = shape.name.toLowerCase().includes('road') || shape.elementKey?.startsWith('road') || shape.attributes?.isRoad;
          const isNavPath = shape.attributes?.isPath === true || shape.name.toLowerCase().includes('path');
          const isWallLine = shape.attributes?.isWall === true;

          const screenPts: { x: number; y: number }[] = [];
          for (let i = 0; i < shape.points.length; i += 2) {
            screenPts.push(shapeToScreen(shape.points[i], shape.points[i + 1]));
          }

          if (isRoad) {
            // Road Curbs
            ctx.strokeStyle = '#9ca3af';
            ctx.lineWidth = Math.max(28 * fitScale * zoom, 12);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            screenPts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
            ctx.stroke();

            // Asphalt Body
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = Math.max(24 * fitScale * zoom, 10);
            ctx.beginPath();
            screenPts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
            ctx.stroke();

            // Yellow Dashed Center line
            ctx.save();
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = Math.max(2.5 * fitScale * zoom, 1);
            ctx.setLineDash([10 * fitScale * zoom, 8 * fitScale * zoom]);
            ctx.beginPath();
            screenPts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
            ctx.stroke();
            ctx.restore();
          } else if (isNavPath) {
            // Google Maps Style Navigation Walking Path (light grey transparent line)
            ctx.save();
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.75)';
            ctx.lineWidth = Math.max(8 * fitScale * zoom, 4);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            screenPts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
            ctx.stroke();

            // Center highlight
            ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
            ctx.lineWidth = Math.max(3 * fitScale * zoom, 1.5);
            ctx.stroke();
            ctx.restore();
          } else if (isWallLine) {
            // Solid Dark Wall Line
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = Math.max(5 * fitScale * zoom, 2);
            ctx.lineCap = 'square';
            ctx.beginPath();
            screenPts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
            ctx.stroke();
          } else {
            // Generic polyline
            ctx.strokeStyle = shape.color || '#3b82f6';
            ctx.lineWidth = Math.max(3 * zoom, 1.5);
            ctx.beginPath();
            screenPts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
            ctx.stroke();
          }
          return;
        }

        // C. Rectangles & Polygons: Lawns, Buildings, Rooms
        if ((shape.geometryType as any) === 'rectangle' || shape.geometryType === 'polygon') {
          ctx.save();
          ctx.translate(p1.x, p1.y);
          if (shape.rotation) {
            ctx.rotate((shape.rotation * Math.PI) / 180);
          }
          ctx.fillStyle = shape.color ? `${shape.color}44` : '#e2e8f0';
          ctx.strokeStyle = shape.color || '#94a3b8';
          ctx.lineWidth = Math.max(1.5 * fitScale * zoom, 1);
          ctx.beginPath();
          ctx.rect(0, 0, sw, sh);
          ctx.fill();
          ctx.stroke();

          // Label
          if (shape.name && sw > 50) {
            ctx.fillStyle = '#475569';
            ctx.font = `600 ${Math.max(10 * fitScale * zoom, 8)}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(shape.name, sw / 2, sh / 2);
          }
          ctx.restore();
          return;
        }

        // D. Circles / Ellipses
        if (shape.geometryType === 'circle' || shape.geometryType === 'ellipse') {
          ctx.save();
          ctx.fillStyle = shape.color ? `${shape.color}44` : '#e2e8f0';
          ctx.strokeStyle = shape.color || '#94a3b8';
          ctx.lineWidth = Math.max(1.5 * zoom, 1);
          ctx.beginPath();
          ctx.ellipse(p1.x + sw / 2, p1.y + sh / 2, sw / 2, sh / 2, 0, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      });
      ctx.restore();
    }

    // 1 & 2: Floor corridors & walkway nodes (only when no 2D custom shapes exist)
    if (shapes.length === 0 && !isRoomView) {
      const floorConns = connections.filter(
        c => c.sourceFloorId === currentFloorId && c.targetFloorId === currentFloorId
      );

      ctx.save();
      floorConns.forEach(conn => {
        const srcNode = floorNodeMap.get(conn.sourceNodeId);
        const tgtNode = floorNodeMap.get(conn.targetNodeId);
        if (!srcNode || !tgtNode) return;

        const p1 = toScreenCoords(srcNode.coordinates);
        const p2 = toScreenCoords(tgtNode.coordinates);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = Math.max(6 * zoom, 3);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = Math.max(2 * zoom, 1);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
      ctx.restore();

      // 2. Draw Walkway Nodes (subtle hallway junctions)
      floorNodes.forEach(node => {
        if (node.type === 'hallway' || node.type === 'outdoor_waypoint') {
          const pt = toScreenCoords(node.coordinates);
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(3 * zoom, 2), 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }

    // Editor shapes and their navigation nodes share the same 1200 × 960 pixel
    // coordinate space. Do not reinterpret small pixel values as metres here:
    // rooms near the top-left of a plan would otherwise have their route shifted.
    const getNodeScreenPt = (coord: { x: number; y: number }) => {
      if (shapes.length > 0) {
        return shapeToScreen(coord.x, coord.y);
      }
      return toScreenCoords(coord);
    };

    // 3. Draw Active Route on current floor / campus. Campus endpoints always
    // receive an outdoor leg when both pins are known; this remains visible
    // while the indoor graph is resolving its entrance hand-off.
    const hasRouteNodes = Boolean(routeResult && ((routeResult.nodes?.length || 0) > 0 || (routeResult.pathNodes?.length || 0) > 0));
    // Campus-level selections can be rendered directly from their object
    // coordinates if a drag-pin state has not been created yet.
    const campusSource = pinPositions?.source || (!sourceObj?.floorId ? sourceObj?.coordinates : undefined);
    const campusDestination = pinPositions?.dest || (!destObj?.floorId ? destObj?.coordinates : undefined);
    const hasCampusEndpoints = viewingCampus && Boolean(campusSource && campusDestination);
    if (hasRouteNodes || hasCampusEndpoints) {
      // Build lookup map from prop nodes + resolved pathNodes
      const allNodeMap = new Map(nodes.map(n => [n.id, n]));
      if (routeResult?.pathNodes) {
        routeResult.pathNodes.forEach(n => { if (!allNodeMap.has(n.id)) allNodeMap.set(n.id, n); });
      }

      const fullPathNodes = (routeResult?.pathNodes && routeResult.pathNodes.length > 0)
        ? routeResult.pathNodes
        : (routeResult?.nodes || []).map(id => allNodeMap.get(id)).filter(Boolean) as SpatialNode[];

      const curFloor = currentFloorId || '';
      const isCampus = viewingCampus;

      const segments: { x: number; y: number }[][] = [];

      if (isCampus) {
        // ── Campus View: never mix floor-plan nodes with campus coordinates.
        // The outdoor leg is deliberately rendered only between the campus
        // source and destination anchors. This keeps it on the campus plan
        // when a destination was chosen from a building floor.
        if (campusSource && campusDestination) {
          const start = campusSource;
          const end = campusDestination;
          // Leave the gate vertically, then turn horizontally to the building
          // entrance. This matches the orthogonal campus-road presentation.
          segments.push([start, { x: start.x, y: end.y }, end]);
        }
      } else {
        // ── Floor View: group path nodes on current floor ──
        let curSegment: { x: number; y: number }[] = [];
        for (let i = 0; i < fullPathNodes.length; i++) {
          const node = fullPathNodes[i];
          const nodeFloor = node.floorId || '';
          const projectedEntrance = !nodeFloor ? floorEntrancePositions[node.id] : undefined;
          if (nodeFloor === curFloor || projectedEntrance) {
            curSegment.push(projectedEntrance || node.coordinates);
          } else {
            if (curSegment.length > 0) {
              segments.push(curSegment);
              curSegment = [];
            }
          }
        }
        if (curSegment.length > 0) segments.push(curSegment);
      }

      // Render route segments with glowing effect
      segments.forEach(segment => {
        if (segment.length < 1) return;

        // If single waypoint, draw prominent arrival dot
        if (segment.length === 1) {
          const pt = getNodeScreenPt(segment[0]);
          ctx.save();
          ctx.fillStyle = '#2563eb';
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
          ctx.lineWidth = Math.max(8 * zoom, 5);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(6 * zoom, 4), 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          return;
        }

        // Outer glow
        ctx.save();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.lineWidth = Math.max(14 * zoom, 8);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        segment.forEach((ptCoord, idx) => {
          const pt = getNodeScreenPt(ptCoord);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();

        // Main polyline
        ctx.save();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = Math.max(5 * zoom, 3);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        segment.forEach((ptCoord, idx) => {
          const pt = getNodeScreenPt(ptCoord);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();

        // Animated dashed overlay
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = Math.max(2 * zoom, 1.5);
        ctx.setLineDash([8 * zoom, 6 * zoom]);
        ctx.stroke();
        ctx.restore();

        // Draw route waypoint dots along path
        segment.forEach(ptCoord => {
          const pt = getNodeScreenPt(ptCoord);
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(4 * zoom, 3), 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        });
      });

      // Highlight Floor Transition Points (Elevator / Stairs / Bridge)
      if (routeResult?.transitions && routeResult.transitions.length > 0) {
        routeResult.transitions.forEach(tr => {
          const fromNode = allNodeMap.get(tr.fromNodeId);
          const toNode = allNodeMap.get(tr.toNodeId);

          // If fromNode is on this floor
          if (fromNode && fromNode.floorId === currentFloorId) {
            const pt = shapes.length > 0 ? shapeToScreen(fromNode.coordinates.x, fromNode.coordinates.y) : toScreenCoords(fromNode.coordinates);
            ctx.save();
            ctx.fillStyle = tr.type === 'elevator' ? '#7c3aed' : '#d97706';
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(14 * zoom, 10), 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(10 * zoom, 8)}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const iconText = tr.type === 'elevator' ? '🛗' : '🪜';
            ctx.fillText(iconText, pt.x, pt.y);

            // Transition callout badge
            ctx.fillStyle = '#1e293b';
            ctx.font = `bold ${Math.max(10 * zoom, 9)}px Inter, sans-serif`;
            const badgeY = pt.y - Math.max(18 * zoom, 14);
            const badgeText = `${tr.type === 'elevator' ? 'Elevator' : 'Stairs'} → Next Floor`;
            const tw = ctx.measureText(badgeText).width;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.beginPath();
            ctx.roundRect(pt.x - tw / 2 - 6, badgeY - 10, tw + 12, 18, 4);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(badgeText, pt.x, badgeY - 1);
            ctx.restore();
          }

          // If toNode is on this floor (arrival from another floor)
          if (toNode && toNode.floorId === currentFloorId && fromNode?.floorId !== currentFloorId) {
            const pt = shapes.length > 0 ? shapeToScreen(toNode.coordinates.x, toNode.coordinates.y) : toScreenCoords(toNode.coordinates);
            ctx.save();
            ctx.fillStyle = '#059669';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(12 * zoom, 9), 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(9 * zoom, 8)}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('ENTRY', pt.x, pt.y);
            ctx.restore();
          }
        });
      }
    }

    // 4. Draw Objects / POIs on this floor
    floorObjects.forEach(obj => {
      const isStart = sourceObj?.id === obj.id;
      const isEnd = destObj?.id === obj.id;
      const isSelected = selectedObj?.id === obj.id;

      // When explicit pinPositions are active, don't draw duplicate A/B markers for start/end
      if (isStart && pinPositions?.source) return;
      if (isEnd && pinPositions?.dest) return;
      // Safety: never draw dest marker when destObj is a floor-level object but we are on campus view
      if (isEnd && destObj?.floorId && !currentFloorId) return;
      // Safety: never draw dest marker on wrong floor
      if (isEnd && destObj?.floorId && currentFloorId && destObj.floorId !== currentFloorId) return;
      // Safety: never draw source marker on floor if source has no floorId (campus-level)
      if (isStart && sourceObj?.floorId === '' && currentFloorId) return;

      // When 2D shapes are present, navigation is visual: only draw pins for Start, Destination, or Selected item!
      if (shapes.length > 0 && !isStart && !isEnd && !isSelected) {
        return;
      }

      let pt: { x: number; y: number };
      if (obj.coordinates && (obj.coordinates.x !== 0 || obj.coordinates.y !== 0)) {
        pt = shapeToScreen(obj.coordinates.x, obj.coordinates.y);
      } else {
        const matchedShape = shapes.find(s =>
          s.objectId === obj.id ||
          s.id === obj.id ||
          (s.name && (typeof obj.name === 'string' ? obj.name : obj.name?.en || '').toLowerCase() === s.name.toLowerCase())
        );
        if (matchedShape) {
          const sw = matchedShape.width || 60;
          const sh = matchedShape.height || 40;
          pt = shapeToScreen(matchedShape.x + sw / 2, matchedShape.y + sh / 2);
        } else {
          pt = toScreenCoords(obj.coordinates);
        }
      }
      const radius = Math.max((isStart || isEnd || isSelected ? 18 : 14) * zoom, 8);

      // Color coding per category
      let fillColor = '#e0e7ff';
      let strokeColor = '#4f46e5';

      if (obj.category === 'lab') {
        fillColor = '#fef3c7'; strokeColor = '#d97706';
      } else if (obj.category === 'accessible_restroom') {
        fillColor = '#dbeafe'; strokeColor = '#2563eb';
      } else if (obj.category === 'auditorium' || obj.category === 'room') {
        fillColor = '#f3e8ff'; strokeColor = '#9333ea';
      } else if (obj.category === 'entrance') {
        fillColor = '#d1fae5'; strokeColor = '#059669';
      } else if (obj.category === 'landmark') {
        fillColor = '#fee2e2'; strokeColor = '#dc2626';
      }

      ctx.save();
      // Highlight halo if start/destination/selected
      if (isStart) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = radius * 0.8;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, radius + 4, 0, 2 * Math.PI); ctx.stroke();
        fillColor = '#10b981';
        strokeColor = '#047857';
      } else if (isEnd) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = radius * 0.8;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, radius + 4, 0, 2 * Math.PI); ctx.stroke();
        fillColor = '#ef4444';
        strokeColor = '#b91c1c';
      } else if (isSelected) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.lineWidth = radius * 0.6;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, radius + 3, 0, 2 * Math.PI); ctx.stroke();
      }

      // Draw object circle
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = Math.max(2.5 * zoom, 1.5);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Pin badge for Start / Destination
      if (isStart || isEnd) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10 * zoom, 8)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isStart ? 'A' : 'B', pt.x, pt.y);
      } else {
        // Category initials or dot
        ctx.fillStyle = strokeColor;
        ctx.font = `bold ${Math.max(9 * zoom, 7)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const initial = (obj.category?.[0] || 'O').toUpperCase();
        ctx.fillText(initial, pt.x, pt.y);
      }

      // Label below object
      const label = typeof obj.name === 'string' ? obj.name : (obj.name?.en || obj.code);
      ctx.font = `${isStart || isEnd ? 'bold' : '500'} ${Math.max(11 * zoom, 9)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const labelY = pt.y + radius + 4;
      const textWidth = ctx.measureText(label).width;

      // Label background plate for legibility
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.roundRect(pt.x - textWidth / 2 - 3, labelY - 1, textWidth + 6, 14 * zoom, 3);
      ctx.fill();

      ctx.fillStyle = isStart ? '#065f46' : isEnd ? '#991b1b' : '#1e293b';
      ctx.fillText(label, pt.x, labelY);
      ctx.restore();
    });


    // 5. Draw explicit pin positions (A/B) from pinPositions prop
    const drawExplicitPin = (pos: { x: number; y: number }, label: string, fillColor: string, strokeColor: string, title?: string) => {
      const sc = shapeToScreen(pos.x, pos.y);
      const radius = Math.max(18 * zoom, 12);
      ctx.save();
      // Halo
      ctx.strokeStyle = fillColor + '55';
      ctx.lineWidth = radius * 0.6;
      ctx.beginPath(); ctx.arc(sc.x, sc.y, radius + 4, 0, 2 * Math.PI); ctx.stroke();
      // Fill circle
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = Math.max(2.5 * zoom, 1.5);
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(sc.x, sc.y, radius, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + Math.max(11 * zoom, 8) + 'px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, sc.x, sc.y);

      // Title badge below pin
      if (title) {
        ctx.font = `bold ${Math.max(11 * zoom, 9)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const labelY = sc.y + radius + 4;
        const textWidth = ctx.measureText(title).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.beginPath();
        ctx.roundRect(sc.x - textWidth / 2 - 4, labelY - 1, textWidth + 8, 14 * zoom + 2, 4);
        ctx.fill();
        ctx.strokeStyle = fillColor === '#10b981' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = fillColor === '#10b981' ? '#065f46' : '#991b1b';
        ctx.fillText(title, sc.x, labelY);
      }
      ctx.restore();
    };

    const startTitle = sourceObj ? (typeof sourceObj.name === 'string' ? sourceObj.name : sourceObj.name?.en || sourceObj.code) : undefined;
    const destTitle = destObj ? (typeof destObj.name === 'string' ? destObj.name : destObj.name?.en || destObj.code) : undefined;

    if (pinPositions?.source) drawExplicitPin(pinPositions.source, 'A', '#10b981', '#047857', startTitle);
    if (pinPositions?.dest) drawExplicitPin(pinPositions.dest, 'B', '#ef4444', '#b91c1c', destTitle);


  }, [dimensions, zoom, pan, objects, nodes, connections, routeResult, currentFloorId, isCampusView, sourceObj, destObj, selectedObj, toScreenCoords, shapes, shapeToScreen, pinPositions, floorEntrancePositions]);

  // Click handler to select object, pick on map, or drill-down
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (wasPinDraggingRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const fitScale = Math.min((dimensions.width - 40) / canvasBounds.width, (dimensions.height - 40) / canvasBounds.height);
    const totalScale = fitScale * zoom;
    const offsetX = (dimensions.width - canvasBounds.width * totalScale) / 2;
    const offsetY = (dimensions.height - canvasBounds.height * totalScale) / 2;
    const canvasX = (clickX - pan.x - offsetX) / totalScale;
    const canvasY = (clickY - pan.y - offsetY) / totalScale;

    // Pick on Map Mode
    if (pickMode && onCanvasPick) {
      let clickedShape: EditorShape | undefined;
      for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        const sx = s.x ?? 0, sy = s.y ?? 0;
        const sw = s.width ?? 60, sh = s.height ?? 40;
        let rx = canvasX - sx, ry = canvasY - sy;
        if (s.rotation) {
          const rad = (-s.rotation * Math.PI) / 180;
          const cos = Math.cos(rad), sin = Math.sin(rad);
          const nrx = rx * cos - ry * sin;
          const nry = rx * sin + ry * cos;
          rx = nrx; ry = nry;
        }
        if (rx >= 0 && rx <= sw && ry >= 0 && ry <= sh && !s.attributes?.isRoomPerimeter) {
          clickedShape = s;
          break;
        }
      }

      let clickedObj: MapObject | undefined;
      for (const obj of objects) {
        const pt = toScreenCoords(obj.coordinates);
        if (Math.hypot(pt.x - clickX, pt.y - clickY) <= Math.max(24 * zoom, 16)) {
          clickedObj = obj;
          break;
        }
      }

      // Also check if clicked near a polyline path or road
      if (!clickedShape) {
        for (let i = shapes.length - 1; i >= 0; i--) {
          const s = shapes[i];
          if (s.geometryType === 'polyline' && s.points && s.points.length >= 4) {
            for (let p = 0; p < s.points.length - 2; p += 2) {
              const x1 = s.points[p], y1 = s.points[p + 1];
              const x2 = s.points[p + 2], y2 = s.points[p + 3];
              const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
              let dist = 999;
              if (l2 === 0) {
                dist = Math.hypot(canvasX - x1, canvasY - y1);
              } else {
                let t = ((canvasX - x1) * (x2 - x1) + (canvasY - y1) * (y2 - y1)) / l2;
                t = Math.max(0, Math.min(1, t));
                dist = Math.hypot(canvasX - (x1 + t * (x2 - x1)), canvasY - (y1 + t * (y2 - y1)));
              }
              if (dist <= 30) {
                clickedShape = s;
                break;
              }
            }
            if (clickedShape) break;
          }
        }
      }

      onCanvasPick({ x: Math.round(canvasX), y: Math.round(canvasY) }, clickedShape, clickedObj);
      return;
    }

    const floorObjects = objects.filter(o => o.floorId === currentFloorId);

    // Hit-test in screen coordinates
    let hit: MapObject | null = null;
    for (const obj of floorObjects) {
      const pt = toScreenCoords(obj.coordinates);
      const dist = Math.hypot(pt.x - clickX, pt.y - clickY);
      if (dist <= Math.max(22 * zoom, 16)) {
        hit = obj;
        break;
      }
    }

    if (hit) {
      setSelectedObj(hit);
      if (onObjectClick) onObjectClick(hit);
      // If clicking a building object or object on campus map, trigger onShapeClick drill-down
      if (onShapeClick) {
        const matchingShape = shapes.find(s => s.objectId === hit!.id || s.id === hit!.id);
        if (matchingShape) {
          onShapeClick(matchingShape);
        } else if (hit.category === 'building' || hit.buildingId) {
          onShapeClick({
            id: hit.buildingId || hit.id,
            name: typeof hit.name === 'string' ? hit.name : hit.name?.en || '',
            objectId: hit.buildingId || hit.id,
            attributes: { buildingId: hit.buildingId || hit.id }
          } as any);
        }
      }
    } else {
      setSelectedObj(null);
      // Check if a shape was clicked (for drill-down navigation)
      if (onShapeClick && shapes.length > 0) {
        const fitScale = Math.min((dimensions.width - 40) / canvasBounds.width, (dimensions.height - 40) / canvasBounds.height);
        const totalScale = fitScale * zoom;
        const offsetX = (dimensions.width - canvasBounds.width * totalScale) / 2;
        const offsetY = (dimensions.height - canvasBounds.height * totalScale) / 2;
        const canvasX = (clickX - pan.x - offsetX) / totalScale;
        const canvasY = (clickY - pan.y - offsetY) / totalScale;

        // Prioritize building shapes over background lawns/walls
        const sortedShapes = [...shapes].sort((a, b) => {
          const aName = (a.name || '').toLowerCase();
          const bName = (b.name || '').toLowerCase();
          const aIsBld = a.objectTypeId === 'building' || aName.includes('block') || aName.includes('building') || aName.includes('hall') || aName.includes('lab') ? 1 : 0;
          const bIsBld = b.objectTypeId === 'building' || bName.includes('block') || bName.includes('building') || bName.includes('hall') || bName.includes('lab') ? 1 : 0;
          return bIsBld - aIsBld;
        });

        for (const s of sortedShapes) {
          if (s.attributes?.isCompoundWall || s.objectTypeId === 'compound_wall') continue;
          const sx = s.x ?? 0, sy = s.y ?? 0;
          const sw = s.width ?? 60, sh = s.height ?? 40;
          let rx = canvasX - sx;
          let ry = canvasY - sy;
          if (s.rotation) {
            const rad = (-s.rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const nrx = rx * cos - ry * sin;
            const nry = rx * sin + ry * cos;
            rx = nrx;
            ry = nry;
          }
          if (rx >= 0 && rx <= sw && ry >= 0 && ry <= sh) {
            onShapeClick(s);
            break;
          }
        }
      }
    }
  };

  // Mouse wheel zoom centered on cursor
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom(prev => Math.min(Math.max(0.5, prev * zoomFactor), 4));
  };

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && pinPositions && onPinDrag) {
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const checkPin = (pos: { x: number; y: number } | undefined, which: 'source' | 'dest') => {
        if (!pos) return false;
        const sc = shapeToScreen(pos.x, pos.y);
        const dist = Math.hypot(sc.x - clickX, sc.y - clickY);
        if (dist <= Math.max(28 * zoom, 24)) {
          setDraggingPin(which);
          setDragPinOffset({ x: clickX - sc.x, y: clickY - sc.y });
          return true;
        }
        return false;
      };
      if (checkPin(pinPositions.source, 'source') || checkPin(pinPositions.dest, 'dest')) {
        e.preventDefault();
        return;
      }
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingPin && onPinDrag) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = e.clientX - rect.left - dragPinOffset.x;
        const clickY = e.clientY - rect.top - dragPinOffset.y;
        const fitScale = Math.min((dimensions.width - 40) / 1200, (dimensions.height - 40) / 960);
        const totalScale = fitScale * zoom;
        const offsetX = (dimensions.width - 1200 * totalScale) / 2;
        const offsetY = (dimensions.height - 960 * totalScale) / 2;
        const canvasX = (clickX - pan.x - offsetX) / totalScale;
        const canvasY = (clickY - pan.y - offsetY) / totalScale;
        onPinDrag(draggingPin, { x: Math.round(canvasX), y: Math.round(canvasY) });
      }
      return;
    }
    // Check hover over pins to show grab cursor
    if (!draggingPin && pinPositions) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const isNear = (pos?: { x: number; y: number }) => {
          if (!pos) return false;
          const sc = shapeToScreen(pos.x, pos.y);
          return Math.hypot(sc.x - mx, sc.y - my) <= Math.max(28 * zoom, 24);
        };
        if (isNear(pinPositions.source) || isNear(pinPositions.dest)) {
          if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
        } else if (canvasRef.current && canvasRef.current.style.cursor === 'grab') {
          canvasRef.current.style.cursor = pickMode ? 'crosshair' : 'default';
        }
      }
    }

    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    if (draggingPin) {
      wasPinDraggingRef.current = true;
      setTimeout(() => { wasPinDraggingRef.current = false; }, 200);
    }
    setDraggingPin(null);
    setIsDragging(false);
  };

  // Touch handlers for mobile pan & pinch-zoom
  const touchStartRef = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      });
    } else if (e.touches.length === 2 && touchStartRef.current.dist) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = newDist / touchStartRef.current.dist;
      setZoom(prev => Math.min(Math.max(0.5, prev * scale), 4));
      touchStartRef.current.dist = newDist;
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Selected object position for popover
  const selectedObjScreen = selectedObj ? toScreenCoords(selectedObj.coordinates) : null;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-100 overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full h-full block ${draggingPin ? 'cursor-move' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      />

      {/* Floating Zoom / Pan Controls */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-1.5 bg-white/95 backdrop-blur-sm rounded-xl p-1 shadow-lg border border-slate-200 z-20">
        <button
          onClick={() => handleZoom(1.2)}
          title="Zoom in"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={() => handleZoom(0.8)}
          title="Zoom out"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <Minus size={18} />
        </button>
        <div className="h-px bg-slate-200 mx-1" />
        <button
          onClick={resetView}
          title="Reset View"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-xs font-mono"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Selected Object Action Popover */}
      {selectedObj && selectedObjScreen && (
        <div 
          className="absolute z-30 bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-64 animate-in fade-in zoom-in-95 pointer-events-auto"
          style={{
            left: Math.min(Math.max(16, selectedObjScreen.x - 128), dimensions.width - 270),
            top: Math.max(16, selectedObjScreen.y - 130),
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-outfit font-bold text-slate-900 text-sm">
                {typeof selectedObj.name === 'string' ? selectedObj.name : selectedObj.name.en}
              </h4>
              <p className="text-xs font-mono text-slate-400">{selectedObj.code}</p>
            </div>
            <button
              onClick={() => setSelectedObj(null)}
              className="text-slate-400 hover:text-slate-600 rounded-md p-1"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {selectedObj.category.replace(/_/g, ' ')}
            </span>
            {selectedObj.isAccessible && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Check size={10} /> Accessible
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => {
                if (onSelectAsSource) onSelectAsSource(selectedObj);
                setSelectedObj(null);
              }}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
            >
              <MapPin size={12} /> Set as Start
            </button>
            <button
              onClick={() => {
                if (onSelectAsDestination) onSelectAsDestination(selectedObj);
                setSelectedObj(null);
              }}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
            >
              <Navigation size={12} /> Set as Dest
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
