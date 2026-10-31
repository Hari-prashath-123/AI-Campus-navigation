import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapObject, SpatialNode, EditorShape } from '../types';
import { CampusConnection } from '../types/connection';
import { RouteResult } from '../api/routing.service';
import { Plus, Minus, RotateCcw, Navigation, MapPin, X, Check } from 'lucide-react';

interface MapViewerProps {
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

    const floorObjects = currentFloorId ? objects.filter(o => o.floorId === currentFloorId) : objects.filter(o => !o.floorId);
    const floorNodes = currentFloorId ? nodes.filter(n => n.floorId === currentFloorId) : nodes.filter(n => !n.floorId);
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

    // 1. Draw floor corridors / connections
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

    // 3. Draw Active Route on current floor
    if (routeResult && routeResult.nodes && routeResult.nodes.length > 0) {
      const allNodeMap = new Map(nodes.map(n => [n.id, n]));
      const fullPathNodes = routeResult.nodes
        .map(id => allNodeMap.get(id))
        .filter(Boolean) as SpatialNode[];

      // Group path nodes into continuous segments on this floor
      const segments: SpatialNode[][] = [];
      let curSegment: SpatialNode[] = [];

      for (let i = 0; i < fullPathNodes.length; i++) {
        const node = fullPathNodes[i];
        if (node.floorId === currentFloorId) {
          curSegment.push(node);
        } else {
          if (curSegment.length > 0) {
            segments.push(curSegment);
            curSegment = [];
          }
        }
      }
      if (curSegment.length > 0) segments.push(curSegment);

      // Render route segments with glowing effect
      segments.forEach(segment => {
        if (segment.length < 1) return;

        // Outer glow
        ctx.save();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.lineWidth = Math.max(14 * zoom, 8);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        segment.forEach((n, idx) => {
          const pt = toScreenCoords(n.coordinates);
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
        segment.forEach((n, idx) => {
          const pt = toScreenCoords(n.coordinates);
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
        segment.forEach(n => {
          const pt = toScreenCoords(n.coordinates);
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
      if (routeResult.transitions && routeResult.transitions.length > 0) {
        routeResult.transitions.forEach(tr => {
          const fromNode = allNodeMap.get(tr.fromNodeId);
          const toNode = allNodeMap.get(tr.toNodeId);

          // If fromNode is on this floor
          if (fromNode && fromNode.floorId === currentFloorId) {
            const pt = toScreenCoords(fromNode.coordinates);
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
            const pt = toScreenCoords(toNode.coordinates);
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

      // When visual 2D shapes are present, suppress generic circles for decorative elements (trees, grass, roads, walls)
      const objNameStr = typeof obj.name === 'string' ? obj.name : (obj.name?.en || obj.code || '');
      const isDecorative = /tree|turf|grass|road|wall|fence|gate|hedge/i.test(objNameStr);
      if (shapes.length > 0 && isDecorative && !isStart && !isEnd && !isSelected) {
        return;
      }

      const pt = toScreenCoords(obj.coordinates);
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

  }, [dimensions, zoom, pan, objects, nodes, connections, routeResult, currentFloorId, sourceObj, destObj, selectedObj, toScreenCoords, shapes, shapeToScreen]);

  // Click handler to select object or open popover
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

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
    } else {
      setSelectedObj(null);
      // Check if a shape was clicked (for drill-down navigation)
      if (onShapeClick && shapes.length > 0) {
        const fitScale = Math.min((dimensions.width - 40) / 1200, (dimensions.height - 40) / 960);
        const totalScale = fitScale * zoom;
        const offsetX = (dimensions.width - 1200 * totalScale) / 2;
        const offsetY = (dimensions.height - 960 * totalScale) / 2;
        const canvasX = (clickX - pan.x - offsetX) / totalScale;
        const canvasY = (clickY - pan.y - offsetY) / totalScale;

        for (let i = shapes.length - 1; i >= 0; i--) {
          const s = shapes[i];
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
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

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
        className={`w-full h-full block ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
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
