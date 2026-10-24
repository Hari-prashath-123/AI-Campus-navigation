import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Line, Ellipse, Transformer, Group, Text } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { EditorShape, EditorTool, Point2D, ObjectType, MapCalibration } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface DraftMeasure {
  x: number; y: number; w: number; h: number;
  type: 'polygon' | 'polyline' | 'point' | null;
  visible: boolean;
}

interface CanvasStageProps {
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
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  shapes, setShapes, onShapeFinalized, selectedIds, setSelectedIds,
  tool, gridSize, isSnapping, onCoordinatesChange, activeType, calibration, onDraftMeasure,
}) => {
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [newShape, setNewShape] = useState<EditorShape | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 1200, h: 800 });

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const snap = (val: number) => (isSnapping ? Math.round(val / gridSize) * gridSize : val);

  // Sync transformer to selected nodes
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const nodes = selectedIds.map(id => stageRef.current.findOne(`#${id}`)).filter(Boolean);
      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIds, shapes]);

  const getRelativePointerPosition = (): Point2D => {
    const stage = stageRef.current;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = stage.getPointerPosition();
    return transform.point(pos);
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const scaleBy = 1.1;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    newScale = Math.max(0.05, Math.min(newScale, 20));
    setScale(newScale);
    setPosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (tool === 'pan') return;
    const isStage = e.target === stageRef.current;

    if (tool === 'select') {
      if (isStage) setSelectedIds([]);
      return;
    }

    if (isStage) {
      setIsDrawing(true);
      const pos = getRelativePointerPosition();
      const sp = { x: snap(pos.x), y: snap(pos.y) };
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
        // Point is finalized immediately
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
    onCoordinatesChange({ x: Math.round(pos.x), y: Math.round(pos.y) });

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

      // Emit measurement overlay data in screen coords
      const stagePos = stageRef.current.getPointerPosition();
      const origin = stageRef.current.getAbsoluteTransform().point({ x: newShape.x, y: newShape.y });
      onDraftMeasure({
        x: Math.min(origin.x, stagePos.x),
        y: Math.min(origin.y, stagePos.y),
        w: Math.abs(stagePos.x - origin.x),
        h: Math.abs(stagePos.y - origin.y),
        type: tool === 'circle' || tool === 'ellipse' ? 'polygon' : 'polygon',
        visible: true,
      });
    } else if (tool === 'line') {
      const updated = { ...newShape, points: [newShape.points[0], newShape.points[1], cur.x, cur.y] };
      setNewShape(updated);
      const origin = stageRef.current.getAbsoluteTransform().point({ x: newShape.points[0], y: newShape.points[1] });
      const end = stageRef.current.getAbsoluteTransform().point({ x: cur.x, y: cur.y });
      onDraftMeasure({ x: origin.x, y: origin.y, w: end.x - origin.x, h: end.y - origin.y, type: 'polyline', visible: true });
    }
  };

  const handleMouseUp = () => {
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

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const id = e.target.id();
    const node = e.target;
    setShapes(prev => prev.map(s => s.id === id ? { ...s, x: snap(node.x()), y: snap(node.y()) } : s));
  };

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    const node = e.target;
    const id = node.id();
    setShapes(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newW = (s.width || 0) * node.scaleX();
      const newH = (s.height || 0) * node.scaleY();
      // Reset scale, bake into width/height
      node.scaleX(1);
      node.scaleY(1);
      return { ...s, x: snap(node.x()), y: snap(node.y()), width: newW, height: newH, scaleX: 1, scaleY: 1, rotation: node.rotation() };
    }));
  };

  // Grid lines
  const renderGrid = () => {
    const lines: React.ReactNode[] = [];
    const W = calibration.canvasWidthPx;
    const H = calibration.canvasHeightPx;
    const pxPerM = calibration.canvasWidthPx / calibration.realWidthMeters;

    // Fine grid
    for (let x = 0; x <= W; x += gridSize) {
      lines.push(<Line key={`v${x}`} points={[x, 0, x, H]} stroke="#e2e8f0" strokeWidth={0.5} />);
    }
    for (let y = 0; y <= H; y += gridSize) {
      lines.push(<Line key={`h${y}`} points={[0, y, W, y]} stroke="#e2e8f0" strokeWidth={0.5} />);
    }
    // 10m major grid
    const major = Math.round(pxPerM * 10);
    for (let x = 0; x <= W; x += major) {
      lines.push(<Line key={`mv${x}`} points={[x, 0, x, H]} stroke="#cbd5e1" strokeWidth={1} />);
    }
    for (let y = 0; y <= H; y += major) {
      lines.push(<Line key={`mh${y}`} points={[0, y, W, y]} stroke="#cbd5e1" strokeWidth={1} />);
    }
    // Canvas boundary
    lines.push(<Rect key="boundary" x={0} y={0} width={W} height={H} stroke="#94a3b8" strokeWidth={2} fill="transparent" />);

    return <Layer listening={false}>{lines}</Layer>;
  };

  const allShapes = [...shapes, newShape].filter(Boolean) as EditorShape[];

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-200">
      <Stage
        ref={stageRef}
        width={containerSize.w}
        height={containerSize.h}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={tool === 'pan'}
        style={{ cursor: tool === 'pan' ? 'grab' : (tool === 'select' ? 'default' : 'crosshair') }}
      >
        {renderGrid()}

        <Layer>
          {allShapes.map(shape => {
            const isSelected = selectedIds.includes(shape.id);
            const isDraft = shape.id.startsWith('draft_');
            const strokeColor = isSelected ? '#2563eb' : shape.color;
            const strokeW = isSelected ? 3 : 2;

            if (shape.geometryType === 'polygon') {
              return (
                <Group key={shape.id}>
                  <Rect
                    id={shape.id}
                    x={shape.x} y={shape.y}
                    width={shape.width || 10} height={shape.height || 10}
                    fill={`${shape.color}25`}
                    stroke={isDraft ? '#94a3b8' : strokeColor}
                    strokeWidth={strokeW}
                    dash={isDraft ? [6, 4] : []}
                    draggable={tool === 'select' && isSelected && !isDraft}
                    onDragEnd={handleDragEnd}
                    onTransformEnd={handleTransformEnd}
                    onClick={() => !isDraft && tool === 'select' && setSelectedIds([shape.id])}
                    rotation={shape.rotation}
                  />
                  {!isDraft && (
                    <Text x={shape.x} y={shape.y - 16} text={shape.name} fontSize={11} fill={shape.color} fontStyle="bold" />
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
                    onClick={() => !isDraft && tool === 'select' && setSelectedIds([shape.id])}
                    rotation={shape.rotation}
                  />
                  {!isDraft && (
                    <Text x={shape.x} y={shape.y - 16} text={shape.name} fontSize={11} fill={shape.color} fontStyle="bold" />
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
                  onClick={() => !isDraft && tool === 'select' && setSelectedIds([shape.id])}
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
                    onClick={() => !isDraft && tool === 'select' && setSelectedIds([shape.id])}
                  />
                  {!isDraft && (
                    <Text x={shape.x + 12} y={shape.y - 5} text={shape.name} fontSize={11} fill={shape.color} fontStyle="bold" />
                  )}
                </Group>
              );
            }
            return null;
          })}

          <Transformer
            ref={transformerRef}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)}
          />
        </Layer>
      </Stage>
    </div>
  );
};
