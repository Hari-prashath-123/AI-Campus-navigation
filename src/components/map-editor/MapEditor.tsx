import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EditorShape, EditorTool, Point2D, MapCalibration, DEFAULT_CALIBRATION, pxToMeters, formatLength } from '../../types';
import { useHistory } from '../../hooks/useHistory';
import { CanvasStage } from './CanvasStage';
import { EditorSidebar } from './EditorSidebar';
import { ObjectPalette } from './ObjectPalette';
import { MapCalibrationModal } from './MapCalibrationModal';
import { MeasurementOverlay } from './MeasurementOverlay';
import { ObjectType, Campus } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import {
  Settings2, CheckCircle2, Clock, AlertTriangle,
  Undo2, Redo2, Copy, Trash2, Grid3X3, MousePointer2,
  Hand, Square, Hexagon, Minus, MapPin, ZoomIn, ZoomOut, Circle,
  Eye, Save, ChevronRight,
} from 'lucide-react';

interface MapEditorProps {
  floorId?: string;
  campusId?: string;
  buildingId?: string;
  campus?: Campus | null;
}

export const MapEditor: React.FC<MapEditorProps> = ({ floorId: _f, campusId: _c, buildingId: _b, campus }) => {
  const [tool, setTool] = useState<EditorTool>('select');
  const [activeType, setActiveType] = useState<ObjectType | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSnapping, setIsSnapping] = useState(true);
  const [gridSize] = useState(20);
  const [pointerCoords, setPointerCoords] = useState<Point2D>({ x: 0, y: 0 });
  const [calibration, setCalibration] = useState<MapCalibration>(DEFAULT_CALIBRATION);
  const [showCalibration, setShowCalibration] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingObjectId, setPendingObjectId] = useState<string | null>(null);
  
  const [activeShapeTool, setActiveShapeTool] = useState<EditorTool>('rectangle');
  const [isShapeDropdownOpen, setIsShapeDropdownOpen] = useState(false);

  const [draftMeasure, setDraftMeasure] = useState<{
    x: number; y: number; w: number; h: number; type: 'polygon' | 'polyline' | 'point' | null; visible: boolean;
  }>({ x: 0, y: 0, w: 0, h: 0, type: null, visible: false });

  const { state: shapes, set: setShapes, undo, redo, canUndo, canRedo } = useHistory([]);

  // Autosave + unsaved changes tracking
  const getStorageKey = useCallback(() => `editor-shapes-${_c || ''}-${_b || ''}-${_f || ''}`, [_c, _b, _f]);

  // Load from local storage
  useEffect(() => {
    const key = getStorageKey();
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setShapes(parsed);
        prevShapeCount.current = parsed.length;
        setSaveStatus('saved');
      } catch (e) {
        console.error('Failed to parse saved shapes');
      }
    } else {
      setShapes([]);
      prevShapeCount.current = 0;
      setSaveStatus('saved');
    }
    // eslint-disable-next-line
  }, [getStorageKey]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevShapeCount = useRef(0);

  // Delete confirmation
  const [pendingDelete, setPendingDelete] = useState(false);

  // Mark unsaved when shapes change
  useEffect(() => {
    if (shapes.length !== prevShapeCount.current) {
      setSaveStatus('unsaved');
      prevShapeCount.current = shapes.length;
    }
  }, [shapes]);

  const performSave = useCallback(() => {
    localStorage.setItem(getStorageKey(), JSON.stringify(shapes));
    setSaveStatus('saved');
    setLastSaved(new Date());
  }, [shapes, getStorageKey]);

  // Autosave after 3 s of inactivity
  useEffect(() => {
    if (saveStatus !== 'unsaved') return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      setSaveStatus('saving');
      setTimeout(performSave, 600);
    }, 3000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [shapes, saveStatus, performSave]);

  // Warn on unload if unsaved
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveStatus]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z') { e.shiftKey ? redo() : undo(); e.preventDefault(); return; }
      if (ctrl && e.key === 'y') { redo(); e.preventDefault(); return; }
      if (ctrl && e.key === 's') { handleManualSave(); e.preventDefault(); return; }
      if (ctrl && e.key === 'd' && selectedIds.length > 0) { handleDuplicate(); e.preventDefault(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        setPendingDelete(true); e.preventDefault(); return;
      }
      if (e.key === 'Escape') { setPendingDelete(false); setSelectedIds([]); return; }
      if (!ctrl) {
        switch (e.key.toLowerCase()) {
          case 'v': setTool('select'); break;
          case 'h': setTool('pan'); break;
          case 'r': setTool('rectangle'); break;
          case 'p': setTool('polygon'); break;
          case 'l': setTool('line'); break;
          case 'm': setTool('point'); break;
          case '+': setZoom(z => Math.min(z + 10, 300)); break;
          case '-': setZoom(z => Math.max(z - 10, 25)); break;
          case '0': setZoom(100); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, undo, redo]);

  const handleManualSave = () => {
    setSaveStatus('saving');
    setTimeout(performSave, 400);
  };

  const handleDuplicate = useCallback(() => {
    setShapes(prev => {
      const dups = prev
        .filter(s => selectedIds.includes(s.id))
        .map(s => ({
          ...s,
          id: uuidv4(),
          name: s.name ? `${s.name} (Copy)` : undefined,
          x: s.x + gridSize,
          y: s.y + gridSize,
          realWorld: s.realWorld ? {
            ...s.realWorld,
            originXMeters: s.realWorld.originXMeters + pxToMeters(gridSize, calibration),
            originYMeters: s.realWorld.originYMeters + pxToMeters(gridSize, calibration),
          } : undefined,
        }));
      setSelectedIds(dups.map(d => d.id));
      return [...prev, ...dups];
    });
  }, [selectedIds, gridSize, calibration, setShapes]);

  const handleDelete = useCallback(() => {
    setShapes(prev => prev.filter(s => !selectedIds.includes(s.id)));
    setSelectedIds([]);
    setPendingDelete(false);
  }, [selectedIds, setShapes]);

  const updateShape = (id: string, updates: Partial<EditorShape>) => {
    setShapes(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, ...updates };
      if ('width' in updates || 'height' in updates || 'x' in updates || 'y' in updates) {
        const wM = pxToMeters(updated.width || 0, calibration);
        const hM = pxToMeters(updated.height || 0, calibration);
        updated.realWorld = {
          originXMeters: pxToMeters(updated.x, calibration),
          originYMeters: pxToMeters(updated.y, calibration),
          widthMeters: wM,
          heightMeters: hM,
          areaM2: wM * hM,
          rotationDeg: updated.rotation,
        };
      }
      return updated;
    }));
  };

  const handleShapeFinalized = useCallback((shape: EditorShape) => {
    const xM = pxToMeters(shape.x, calibration);
    const yM = pxToMeters(shape.y, calibration);
    const wM = shape.width ? pxToMeters(shape.width, calibration) : 0;
    const hM = shape.height ? pxToMeters(shape.height, calibration) : 0;

    const withRealWorld: EditorShape = {
      ...shape,
      objectId: pendingObjectId || undefined,
      realWorld: {
        originXMeters: xM,
        originYMeters: yM,
        widthMeters: wM || undefined,
        heightMeters: hM || undefined,
        areaM2: (wM && hM) ? wM * hM : undefined,
        rotationDeg: shape.rotation,
      },
    };
    setShapes(prev => [...prev, withRealWorld]);
    setSelectedIds([withRealWorld.id]);
    setPendingObjectId(null);
  }, [calibration, pendingObjectId, setShapes]);

  const handleSelectType = (type: ObjectType) => {
    setActiveType(type);
    setPendingObjectId(null);
    if (['entrance', 'amenity', 'transit'].includes(type.category)) {
      setTool('point');
    } else {
      setTool('rectangle');
    }
  };

  const handleSelectUnplaced = (entity: { id: string, name: string, category: string, type: 'building' | 'object' }) => {
    setActiveType({
      id: 'generic-unplaced',
      name: entity.name,
      category: entity.category as any,
      color: entity.type === 'building' ? '#2563eb' : '#10b981',
      iconName: entity.type === 'building' ? 'Building2' : 'Box',
      properties: [],
      isNavigable: false,
    });
    setPendingObjectId(entity.id);
    setTool(entity.type === 'building' ? 'rectangle' : 'point');
  };

  const selectedShapes = shapes.filter(s => selectedIds.includes(s.id));
  const coordXM = pxToMeters(pointerCoords.x, calibration);
  const coordYM = pxToMeters(pointerCoords.y, calibration);

  const basicTools = [
    { id: 'select', icon: MousePointer2, label: 'Select', key: 'V' },
    { id: 'pan', icon: Hand, label: 'Pan', key: 'H' },
  ];

  const shapeTools = [
    { id: 'rectangle', icon: Square, label: 'Rectangle', key: 'R' },
    { id: 'polygon', icon: Hexagon, label: 'Polygon', key: 'P' },
    { id: 'circle', icon: Circle, label: 'Circle', key: 'C' },
  ];

  const otherTools = [
    { id: 'line', icon: Minus, label: 'Line / Path', key: 'L' },
    { id: 'point', icon: MapPin, label: 'Point', key: 'M' },
  ];

  return (
    <div className="flex flex-col w-full h-full bg-slate-100 overflow-hidden">

      {/* ── TOP BAR ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 shrink-0 shadow-sm z-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
          <span className="text-slate-400">Campuses</span>
          <ChevronRight size={12} className="text-slate-300" />
          <span className={campus ? 'text-slate-700' : 'text-slate-400'}>
            {campus ? (typeof campus.name === 'string' ? campus.name : campus.name.en) : 'Campus'}
          </span>
          <ChevronRight size={12} className="text-slate-300" />
          <span className="text-blue-600 font-semibold">Map Editor</span>
        </div>

        <div className="flex-1" />

        {/* Tool buttons – centered */}
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-1 border border-slate-200">
          {basicTools.map((t) => {
            const Icon = t.icon;
            const isActive = tool === t.id;
            return (
              <button
                key={t.id}
                title={`${t.label} (${t.key})`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive ? 'bg-white shadow-sm text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
                onClick={() => setTool(t.id as EditorTool)}
              >
                <Icon size={14} />
                <span className="hidden lg:inline">{t.label}</span>
              </button>
            );
          })}
          
          <div className="w-px h-5 bg-slate-300 mx-1" />
          
          <div className="relative">
            <button 
              onClick={() => {
                if (tool === activeShapeTool) setIsShapeDropdownOpen(!isShapeDropdownOpen);
                else setTool(activeShapeTool);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                shapeTools.find(s => s.id === tool) ? 'bg-white shadow-sm text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              {React.createElement(shapeTools.find(s => s.id === activeShapeTool)?.icon || Square, { size: 14 })}
              <span className="hidden lg:inline">{shapeTools.find(s => s.id === activeShapeTool)?.label}</span>
              <ChevronRight size={14} className={`transform transition-transform ${isShapeDropdownOpen ? 'rotate-90' : ''}`} />
            </button>
            
            {isShapeDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden flex flex-col py-1 z-50">
                {shapeTools.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveShapeTool(s.id as EditorTool);
                      setTool(s.id as EditorTool);
                      setIsShapeDropdownOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                  >
                    <s.icon size={16} />
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="w-px h-5 bg-slate-300 mx-1" />

          {otherTools.map((t) => {
            const Icon = t.icon;
            const isActive = tool === t.id;
            return (
              <button
                key={t.id}
                title={`${t.label} (${t.key})`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive ? 'bg-white shadow-sm text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
                onClick={() => setTool(t.id as EditorTool)}
              >
                <Icon size={14} />
                <span className="hidden lg:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Right-side actions */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg p-0.5 bg-white">
            <button title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}
              className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors">
              <Undo2 size={14} />
            </button>
            <button title="Redo (Ctrl+Y)" disabled={!canRedo} onClick={redo}
              className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors">
              <Redo2 size={14} />
            </button>
          </div>

          {/* Snap */}
          <button
            title={`Snap to Grid (${isSnapping ? 'On' : 'Off'})`}
            onClick={() => setIsSnapping(!isSnapping)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isSnapping ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Grid3X3 size={14} /> Snap
          </button>

          {/* Zoom */}
          <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg p-0.5 bg-white">
            <button title="Zoom Out (-)" onClick={() => setZoom(z => Math.max(z - 10, 25))} className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors">
              <ZoomOut size={14} />
            </button>
            <button title="Reset Zoom (0)" onClick={() => setZoom(100)} className="px-2 text-xs font-mono text-slate-700 hover:bg-slate-100 rounded transition-colors">
              {zoom}%
            </button>
            <button title="Zoom In (+)" onClick={() => setZoom(z => Math.min(z + 10, 300))} className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors">
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Duplicate / Delete */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg p-0.5 bg-white">
              <button title="Duplicate (Ctrl+D)" onClick={handleDuplicate}
                className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors">
                <Copy size={14} />
              </button>
              <button title="Delete (Del)" onClick={() => setPendingDelete(true)}
                className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          )}

          {/* Preview */}
          <button
            title="Preview Mode"
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              showPreview ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Eye size={14} /> Preview
          </button>

          {/* Calibrate */}
          <button
            title="Map Settings & Calibration"
            onClick={() => setShowCalibration(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all"
          >
            <Settings2 size={14} /> Settings
          </button>

          {/* Save */}
          <button
            onClick={handleManualSave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <Save size={14} /> Save
          </button>

          {/* Save status indicator */}
          <div className="flex items-center gap-1.5 text-xs min-w-[90px]">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 size={13} /> Saved {lastSaved ? lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle size={13} /> Unsaved
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-blue-600 animate-pulse">
                <Clock size={13} /> Saving…
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN 3-PANE LAYOUT ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Object Palette */}
        <ObjectPalette 
          onSelectType={handleSelectType} 
          activeTypeId={activeType?.id || null} 
          campusId={_c} 
          floorId={_f} 
          placedObjectIds={shapes.map(s => s.objectId).filter(Boolean) as string[]}
          onSelectUnplaced={handleSelectUnplaced}
        />

        {/* CENTER: Canvas */}
        <div className="flex-1 flex flex-col min-w-0 relative">

          {/* Active type badge */}
          {activeType && tool !== 'select' && tool !== 'pan' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
              <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
              Drawing: {activeType.name} — Click & drag to place
            </div>
          )}

          {/* Preview overlay badge */}
          {showPreview && (
            <div className="absolute inset-0 z-20 pointer-events-none border-4 border-emerald-400 rounded">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                PREVIEW MODE — No editing
              </div>
            </div>
          )}

          {/* Canvas wrapper */}
          <div className="flex-1 relative overflow-hidden" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', width: `${10000 / zoom}%`, height: `${10000 / zoom}%` }}>
            <CanvasStage
              shapes={shapes}
              setShapes={setShapes}
              onShapeFinalized={handleShapeFinalized}
              selectedIds={showPreview ? [] : selectedIds}
              setSelectedIds={showPreview ? () => {} : setSelectedIds}
              tool={showPreview ? 'select' : tool}
              gridSize={gridSize}
              isSnapping={isSnapping}
              onCoordinatesChange={setPointerCoords}
              activeType={activeType}
              calibration={calibration}
              onDraftMeasure={setDraftMeasure}
            />
            <MeasurementOverlay
              draftX={draftMeasure.x}
              draftY={draftMeasure.y}
              draftWidth={draftMeasure.w}
              draftHeight={draftMeasure.h}
              geometryType={draftMeasure.type}
              calibration={calibration}
              visible={draftMeasure.visible && !showPreview}
            />
          </div>

          {/* ── STATUS BAR ───────────────────────────────────────────── */}
          <div className="bg-white border-t border-slate-200 px-4 py-1.5 flex items-center gap-6 text-[11px] font-mono text-slate-500 shrink-0">
            <span>
              <span className="text-slate-400">X:</span> <strong className="text-slate-700">{formatLength(coordXM, calibration.unitSystem)}</strong>
              {'  '}<span className="text-slate-400">Y:</span> <strong className="text-slate-700">{formatLength(coordYM, calibration.unitSystem)}</strong>
            </span>
            <span><span className="text-slate-400">Grid:</span> {formatLength(pxToMeters(gridSize, calibration), calibration.unitSystem)}</span>
            <span><span className="text-slate-400">Scale:</span> {(calibration.canvasWidthPx / calibration.realWidthMeters).toFixed(1)} px/m</span>
            <span><span className="text-slate-400">Canvas:</span> {calibration.realWidthMeters}m × {calibration.realHeightMeters}m</span>
            <span><span className="text-slate-400">Objects:</span> {shapes.length}</span>
            {selectedIds.length > 0 && (
              <span className="text-blue-600"><span className="text-blue-400">Selected:</span> {selectedIds.length}</span>
            )}
            <div className="flex-1" />
            <span className="uppercase tracking-widest text-slate-400 font-semibold">{tool}</span>
            <span className="text-slate-400">Snap: {isSnapping ? <span className="text-indigo-600">ON</span> : 'OFF'}</span>
            
            <button 
              onClick={() => document.getElementById('editor-sidebar')?.classList.toggle('hidden')}
              className="ml-4 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 transition-colors"
            >
              Toggle Panel
            </button>
          </div>
        </div>

        {/* RIGHT: Properties Panel */}
        <div id="editor-sidebar" className="flex flex-col h-full z-10 shrink-0">
          <EditorSidebar
            selectedShapes={selectedShapes}
            updateShape={updateShape}
            onDuplicate={handleDuplicate}
            calibration={calibration}
          />
        </div>
      </div>

      {/* ── DELETE CONFIRMATION DIALOG ─────────────────────────────────── */}
      {pendingDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Delete {selectedIds.length} object{selectedIds.length !== 1 ? 's' : ''}?</h3>
                <p className="text-xs text-slate-500 mt-1">This action can be undone with Ctrl+Z.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setPendingDelete(false)}
                className="px-4 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                Cancel (Esc)
              </button>
              <button onClick={handleDelete}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors shadow-sm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calibration modal */}
      <MapCalibrationModal
        isOpen={showCalibration}
        onClose={() => setShowCalibration(false)}
        calibration={calibration}
        onChange={setCalibration}
      />
    </div>
  );
};
