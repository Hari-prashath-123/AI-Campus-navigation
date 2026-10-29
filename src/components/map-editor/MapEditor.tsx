import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  EditorShape, EditorTool, Point2D, MapCalibration, DEFAULT_CALIBRATION,
  pxToMeters, formatLength, LayerVisibility, Campus, Building, Floor, FloorOverlayConfig
} from '../../types';
import { SpatialNode, CampusConnection, SpatialNodeType } from '../../types/connection';
import { useHistory } from '../../hooks/useHistory';
import { useNavStore } from '../../hooks/useNavStore';
import { useObjectStore } from '../../hooks/useObjectStore';
import { campusService } from '../../api/campus.service';
import { CanvasStage } from './CanvasStage';
import { EditorSidebar } from './EditorSidebar';
import { ObjectPalette } from './ObjectPalette';
import { MapCalibrationModal } from './MapCalibrationModal';
import { MeasurementOverlay } from './MeasurementOverlay';
import { LayerPanel } from './LayerPanel';
import { ValidationPanel } from './ValidationPanel';
import { FloorConnectorModal } from './FloorConnectorModal';
import { MapImportExportModal } from './MapImportExportModal';
import { validateCampusGraph } from '../../utils/graph-validation';
import { ObjectType } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import {
  Settings2, CheckCircle2, Clock, AlertTriangle,
  Undo2, Redo2, Trash2, Grid3X3,
  ZoomIn, ZoomOut, Eye, Save, ChevronRight, Layers,
  ShieldCheck, Maximize2, Download,
  Landmark, Building2
} from 'lucide-react';

interface MapEditorProps {
  floorId?: string;
  campusId?: string;
  buildingId?: string;
  campus?: Campus | null;
}

export const MapEditor: React.FC<MapEditorProps> = ({
  floorId: propFloorId,
  campusId: propCampusId,
  buildingId: propBuildingId,
}) => {
  // ── Hierarchy State (Campus, Building, Floor) ──────────────────────────────
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);

  const [activeCampusId, setActiveCampusId] = useState<string>(propCampusId || '');
  const [activeBuildingId, setActiveBuildingId] = useState<string>(propBuildingId || '');
  const [activeFloorId, setActiveFloorId] = useState<string>(propFloorId || '');

  // Load campus hierarchy
  useEffect(() => {
    campusService.getCampuses().then(res => {
      if (res.success && res.data.length > 0) {
        setCampuses(res.data);
        if (!activeCampusId) {
          const defaultCampus = propCampusId || res.data[0].id;
          setActiveCampusId(defaultCampus);
        }
      }
    });
  }, [propCampusId]);

  useEffect(() => {
    if (!activeCampusId) return;
    campusService.getBuildingsByCampus(activeCampusId).then(res => {
      if (res.success && res.data) {
        setBuildings(res.data);
        if (!activeBuildingId || !res.data.some(b => b.id === activeBuildingId)) {
          const defaultBuilding = propBuildingId || (res.data[0]?.id || '');
          setActiveBuildingId(defaultBuilding);
        }
      }
    });
  }, [activeCampusId, propBuildingId]);

  useEffect(() => {
    if (!activeBuildingId) return;
    campusService.getFloorsByBuilding(activeBuildingId).then(res => {
      if (res.success && res.data) {
        setFloors(res.data);
        if (!activeFloorId || !res.data.some(f => f.id === activeFloorId)) {
          const defaultFloor = propFloorId || (res.data[0]?.id || '');
          setActiveFloorId(defaultFloor);
        }
      }
    });
  }, [activeBuildingId, propFloorId]);

  const activeCampus = useMemo(() => campuses.find(c => c.id === activeCampusId) || null, [campuses, activeCampusId]);
  const activeBuilding = useMemo(() => buildings.find(b => b.id === activeBuildingId) || null, [buildings, activeBuildingId]);
  const activeFloor = useMemo(() => floors.find(f => f.id === activeFloorId) || null, [floors, activeFloorId]);

  // ── Floor Plan Reference Image & Overlay State ──────────────────────────────
  const [floorPlanUrl, setFloorPlanUrl] = useState<string>('');
  const [floorOverlay, setFloorOverlay] = useState<FloorOverlayConfig>({
    opacity: 0.65,
    rotationDegrees: 0,
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  });

  // Sync floor plan reference image when floor changes
  useEffect(() => {
    if (activeFloor) {
      setFloorPlanUrl(activeFloor.planImageUrl || '');
      if (activeFloor.overlayConfig) {
        setFloorOverlay(activeFloor.overlayConfig);
      } else {
        setFloorOverlay({
          opacity: 0.65,
          rotationDegrees: 0,
          scaleX: 1,
          scaleY: 1,
          offsetX: 0,
          offsetY: 0,
        });
      }
    }
  }, [activeFloor]);

  // ── Unified Stores ──────────────────────────────────────────────────────────
  const {
    nodes: floorNodes,
    connections: campusConnections,
    createNode,
    updateNode,
    deleteNode,
    createConnection,
    updateConnection,
    deleteConnection,
  } = useNavStore({ campusId: activeCampusId, floorId: activeFloorId });

  const {
    objects: floorObjects,
    createObject,
    updateObject,
    deleteObject,
  } = useObjectStore({ campusId: activeCampusId, floorId: activeFloorId });

  // ── Editor Tools & Selection ───────────────────────────────────────────────
  const [tool, setTool] = useState<EditorTool>('select');
  const [activeType, setActiveType] = useState<ObjectType | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<SpatialNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<CampusConnection | null>(null);
  const [nodeTypeToCreate, setNodeTypeToCreate] = useState<SpatialNodeType>('hallway');

  // Layer visibility
  const [layers, setLayers] = useState<LayerVisibility>({
    floorplanImage: true,
    nodes: true,
    edges: true,
    objects: true,
    grid: true,
    validationWarnings: true,
  });
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
  const [isValidationPanelOpen, setIsValidationPanelOpen] = useState(false);
  const [isFloorConnectorModalOpen, setIsFloorConnectorModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);

  // Snapping & Measurement & Fit-to-View
  const [isSnapping, setIsSnapping] = useState(true);
  const [gridSize] = useState(20);
  const [pointerCoords, setPointerCoords] = useState<Point2D>({ x: 0, y: 0 });
  const [calibration, setCalibration] = useState<MapCalibration>(DEFAULT_CALIBRATION);
  const [showCalibration, setShowCalibration] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingObjectId, setPendingObjectId] = useState<string | null>(null);
  const [fitToViewTrigger, setFitToViewTrigger] = useState(0);

  const [draftMeasure, setDraftMeasure] = useState<{
    x: number; y: number; w: number; h: number; type: 'polygon' | 'polyline' | 'point' | null; visible: boolean;
  }>({ x: 0, y: 0, w: 0, h: 0, type: null, visible: false });

  // Shapes with undo/redo
  const { state: shapes, set: setShapes, undo, redo, canUndo, canRedo } = useHistory([]);

  // Autosave & Persistence tracking
  const getStorageKey = useCallback(() => `editor-shapes-${activeCampusId}-${activeBuildingId}-${activeFloorId}`, [activeCampusId, activeBuildingId, activeFloorId]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevShapeCount = useRef(0);
  const [pendingDelete, setPendingDelete] = useState(false);

  // Load from local storage or hydrate from objectStore
  useEffect(() => {
    const key = getStorageKey();
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setShapes(parsed);
        prevShapeCount.current = parsed.length;
        setSaveStatus('saved');
        return;
      } catch (e) {
        console.error('Failed to parse saved shapes');
      }
    }

    // Fallback: Hydrate shapes from objectStore objects on this floor
    if (floorObjects.length > 0) {
      const pxPerM = calibration.canvasWidthPx / calibration.realWidthMeters;
      const hydratedShapes: EditorShape[] = floorObjects.map(obj => {
        const geomType = obj.geometryType || 'polygon';
        const x = Math.round(obj.coordinates.x * pxPerM);
        const y = Math.round(obj.coordinates.y * pxPerM);
        const name = typeof obj.name === 'string' ? obj.name : obj.name.en || obj.code;
        return {
          id: `shape_${obj.id}`,
          objectId: obj.id,
          objectTypeId: obj.objectTypeId || 'generic',
          geometryType: geomType,
          points: [x, y, x + 60, y + 40],
          x,
          y,
          width: 60,
          height: 40,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          name,
          color: '#3b82f6',
          attributes: {
            associatedNodeId: obj.associatedNodeId,
            ...(obj.attributes || {}),
          },
          realWorld: {
            originXMeters: obj.coordinates.x,
            originYMeters: obj.coordinates.y,
            widthMeters: 60 / pxPerM,
            heightMeters: 40 / pxPerM,
            areaM2: (60 / pxPerM) * (40 / pxPerM),
            rotationDeg: 0,
          },
        };
      });
      setShapes(hydratedShapes);
      prevShapeCount.current = hydratedShapes.length;
    } else {
      setShapes([]);
      prevShapeCount.current = 0;
    }
    setSaveStatus('saved');
  }, [getStorageKey, activeFloorId]);

  // Mark unsaved when shapes change
  useEffect(() => {
    if (shapes.length !== prevShapeCount.current) {
      setSaveStatus('unsaved');
      prevShapeCount.current = shapes.length;
    }
  }, [shapes]);

  // Unsaved changes browser warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Guard hierarchy switching if unsaved
  const handleSelectCampus = (newCampusId: string) => {
    if (saveStatus === 'unsaved') {
      const ok = window.confirm('You have unsaved changes on this floor. Discard and switch campus?');
      if (!ok) return;
    }
    setActiveCampusId(newCampusId);
    setActiveBuildingId('');
    setActiveFloorId('');
  };

  const handleSelectBuilding = (newBuildingId: string) => {
    if (saveStatus === 'unsaved') {
      const ok = window.confirm('You have unsaved changes on this floor. Discard and switch building?');
      if (!ok) return;
    }
    setActiveBuildingId(newBuildingId);
    setActiveFloorId('');
  };

  const handleSelectFloor = (newFloorId: string) => {
    if (saveStatus === 'unsaved') {
      const ok = window.confirm('You have unsaved changes on this floor. Discard and switch floor?');
      if (!ok) return;
    }
    setActiveFloorId(newFloorId);
  };

  // Persist shapes & floor overlay through backend
  const performSave = useCallback(async () => {
    setSaveStatus('saving');

    // 1. Save shapes to localStorage
    localStorage.setItem(getStorageKey(), JSON.stringify(shapes));

    // 2. Persist shapes into objectStore
    shapes.forEach(shape => {
      if (shape.objectId) {
        updateObject(shape.objectId, {
          name: { en: shape.name },
          coordinates: {
            x: shape.realWorld?.originXMeters ?? pxToMeters(shape.x, calibration),
            y: shape.realWorld?.originYMeters ?? pxToMeters(shape.y, calibration),
          },
          associatedNodeId: shape.attributes?.associatedNodeId,
          attributes: shape.attributes,
        });
      }
    });

    // 3. Persist floor reference blueprint image and overlay configuration to backend
    if (activeFloorId) {
      await campusService.updateFloor(activeFloorId, {
        planImageUrl: floorPlanUrl,
        overlayConfig: floorOverlay,
      });
    }

    setSaveStatus('saved');
    setLastSaved(new Date());
  }, [shapes, getStorageKey, updateObject, calibration, activeFloorId, floorPlanUrl, floorOverlay]);

  // Autosave debounce timer
  useEffect(() => {
    if (saveStatus !== 'unsaved') return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      performSave();
    }, 3000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [shapes, saveStatus, performSave]);

  const triggerFitToView = () => setFitToViewTrigger(prev => prev + 1);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z') { e.shiftKey ? redo() : undo(); e.preventDefault(); return; }
      if (ctrl && e.key === 'y') { redo(); e.preventDefault(); return; }
      if (ctrl && e.key === 's') { performSave(); e.preventDefault(); return; }
      if (ctrl && e.key === 'd' && selectedIds.length > 0) { handleDuplicate(); e.preventDefault(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          setPendingDelete(true);
          e.preventDefault();
          return;
        }
        if (selectedNode) {
          deleteNode(selectedNode.id);
          setSelectedNode(null);
          e.preventDefault();
          return;
        }
        if (selectedEdge) {
          deleteConnection(selectedEdge.id);
          setSelectedEdge(null);
          e.preventDefault();
          return;
        }
      }
      if (e.key === 'Escape') {
        setPendingDelete(false);
        setSelectedIds([]);
        setSelectedNode(null);
        setSelectedEdge(null);
        if (tool === 'add_edge' || tool === 'add_node') setTool('select');
        return;
      }
      if (!ctrl) {
        switch (e.key.toLowerCase()) {
          case 'v': setTool('select'); break;
          case 'h': setTool('pan'); break;
          case 'r': setTool('rectangle'); break;
          case 'p': setTool('polygon'); break;
          case 'c': setTool('circle'); break;
          case 'l': setTool('line'); break;
          case 'm': setTool('point'); break;
          case 'n': setTool('add_node'); break;
          case 'e': setTool('add_edge'); break;
          case 'f': triggerFitToView(); e.preventDefault(); break;
          case '+': setZoom(z => Math.min(z + 10, 300)); break;
          case '-': setZoom(z => Math.max(z - 10, 25)); break;
          case '0': setZoom(100); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, selectedNode, selectedEdge, undo, redo, tool, performSave, deleteNode, deleteConnection]);

  // Graph validation computation
  const validationReport = useMemo(() => {
    return validateCampusGraph(floorNodes, campusConnections, floorObjects);
  }, [floorNodes, campusConnections, floorObjects]);

  // Duplicate selected shapes
  const handleDuplicate = useCallback(() => {
    setShapes(prev => {
      const dups = prev
        .filter(s => selectedIds.includes(s.id))
        .map(s => ({
          ...s,
          id: uuidv4(),
          name: s.name ? `${s.name} (Copy)` : 'Object (Copy)',
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
    setSaveStatus('unsaved');
  }, [selectedIds, gridSize, calibration, setShapes]);

  // Delete selected shapes
  const handleDelete = useCallback(() => {
    shapes.filter(s => selectedIds.includes(s.id)).forEach(s => {
      if (s.objectId) {
        deleteObject(s.objectId);
      }
    });
    setShapes(prev => prev.filter(s => !selectedIds.includes(s.id)));
    setSelectedIds([]);
    setPendingDelete(false);
    setSaveStatus('unsaved');
  }, [selectedIds, setShapes, shapes, deleteObject]);

  // Multi-selection alignment
  const handleBulkAlign = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedIds.length <= 1) return;
    const targets = shapes.filter(s => selectedIds.includes(s.id));
    if (targets.length === 0) return;

    const minX = Math.min(...targets.map(s => s.x));
    const maxX = Math.max(...targets.map(s => s.x + (s.width || 0)));
    const minY = Math.min(...targets.map(s => s.y));
    const maxY = Math.max(...targets.map(s => s.y + (s.height || 0)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setShapes(prev => prev.map(s => {
      if (!selectedIds.includes(s.id)) return s;
      const w = s.width || 0;
      const h = s.height || 0;
      let newX = s.x;
      let newY = s.y;

      if (alignment === 'left') newX = minX;
      else if (alignment === 'center') newX = centerX - w / 2;
      else if (alignment === 'right') newX = maxX - w;
      else if (alignment === 'top') newY = minY;
      else if (alignment === 'middle') newY = centerY - h / 2;
      else if (alignment === 'bottom') newY = maxY - h;

      const xM = pxToMeters(newX, calibration);
      const yM = pxToMeters(newY, calibration);

      return {
        ...s,
        x: newX,
        y: newY,
        realWorld: s.realWorld ? {
          ...s.realWorld,
          originXMeters: xM,
          originYMeters: yM,
        } : undefined,
      };
    }));
    setSaveStatus('unsaved');
  }, [selectedIds, shapes, calibration, setShapes]);

  // Update shape
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

      if (updated.objectId) {
        updateObject(updated.objectId, {
          name: { en: updated.name },
          coordinates: {
            x: updated.realWorld?.originXMeters || pxToMeters(updated.x, calibration),
            y: updated.realWorld?.originYMeters || pxToMeters(updated.y, calibration),
          },
          associatedNodeId: updated.attributes?.associatedNodeId,
          attributes: updated.attributes,
        });
      }
      return updated;
    }));
    setSaveStatus('unsaved');
  };

  // Finalize shape -> bridge to objectStore
  const handleShapeFinalized = useCallback((shape: EditorShape) => {
    const xM = pxToMeters(shape.x, calibration);
    const yM = pxToMeters(shape.y, calibration);
    const wM = shape.width ? pxToMeters(shape.width, calibration) : 0;
    const hM = shape.height ? pxToMeters(shape.height, calibration) : 0;

    let targetObjectId = shape.objectId || pendingObjectId;

    if (!targetObjectId) {
      const createdObj = createObject({
        campusId: activeCampusId,
        buildingId: activeBuildingId,
        floorId: activeFloorId,
        code: `ROOM-${Math.floor(Math.random() * 900 + 100)}`,
        name: { en: shape.name },
        category: activeType?.category || 'room',
        objectTypeId: shape.objectTypeId,
        geometryType: shape.geometryType,
        coordinates: { x: xM, y: yM },
        associatedNodeId: '',
        isAccessible: true,
      });
      targetObjectId = createdObj.id;
    } else {
      updateObject(targetObjectId, {
        geometryType: shape.geometryType,
        coordinates: { x: xM, y: yM },
      });
    }

    const withRealWorld: EditorShape = {
      ...shape,
      objectId: targetObjectId || undefined,
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
    setSaveStatus('unsaved');
  }, [calibration, pendingObjectId, activeCampusId, activeBuildingId, activeFloorId, activeType, createObject, updateObject, setShapes]);

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
      slug: 'generic-unplaced',
      name: entity.name,
      description: '',
      category: entity.category as any,
      color: entity.type === 'building' ? '#2563eb' : '#10b981',
      iconName: entity.type === 'building' ? 'Building2' : 'Box',
      propertyDefinitions: [],
      isNavigable: false,
      isBarrier: false,
      isConnector: false,
      isSystem: false,
      sortOrder: 0,
      createdAt: '',
      updatedAt: '',
    });
    setPendingObjectId(entity.id);
    setTool(entity.type === 'building' ? 'rectangle' : 'point');
  };

  const handleToggleLayer = (layerKey: keyof LayerVisibility) => {
    setLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const handleUpdateFloorOverlay = (overlay: FloorOverlayConfig, planImageUrl?: string) => {
    setFloorOverlay(overlay);
    if (planImageUrl !== undefined) {
      setFloorPlanUrl(planImageUrl);
    }
    setSaveStatus('unsaved');
  };

  // Import map data handler
  const handleImportMapData = useCallback((data: { shapes?: EditorShape[]; nodes?: SpatialNode[]; connections?: CampusConnection[] }, mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      if (data.shapes) setShapes(data.shapes);
      if (data.nodes) {
        floorNodes.forEach(n => deleteNode(n.id));
        data.nodes.forEach(n => createNode(n));
      }
      if (data.connections) {
        campusConnections.forEach(c => deleteConnection(c.id));
        data.connections.forEach(c => createConnection(c));
      }
    } else {
      if (data.shapes) setShapes(prev => [...prev, ...(data.shapes || [])]);
      if (data.nodes) data.nodes.forEach(n => createNode(n));
      if (data.connections) data.connections.forEach(c => createConnection(c));
    }
    setSaveStatus('unsaved');
  }, [floorNodes, campusConnections, deleteNode, createNode, deleteConnection, createConnection, setShapes]);

  const selectedShapes = shapes.filter(s => selectedIds.includes(s.id));
  const coordXM = pxToMeters(pointerCoords.x, calibration);
  const coordYM = pxToMeters(pointerCoords.y, calibration);

  return (
    <div className="flex flex-col w-full h-full bg-slate-100 overflow-hidden select-none">

      {/* ── TOP TOOLBAR ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 shadow-xs z-20 gap-3">
        
        {/* 3-Level Hierarchy Navigator: Campus (Site) -> Building -> Floor */}
        <div className="flex items-center gap-1.5 text-xs">
          
          {/* Site / Campus */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <Landmark size={13} className="text-blue-600 shrink-0" />
            <select
              value={activeCampusId}
              onChange={e => handleSelectCampus(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 text-xs focus:outline-none cursor-pointer"
              title="Site / Campus"
            >
              {campuses.map(c => (
                <option key={c.id} value={c.id}>
                  {typeof c.name === 'string' ? c.name : c.name.en}
                </option>
              ))}
            </select>
          </div>

          <ChevronRight size={13} className="text-slate-300 shrink-0" />

          {/* Building */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <Building2 size={13} className="text-indigo-600 shrink-0" />
            <select
              value={activeBuildingId}
              onChange={e => handleSelectBuilding(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 text-xs focus:outline-none cursor-pointer"
              title="Building"
            >
              {buildings.map(b => (
                <option key={b.id} value={b.id}>
                  {typeof b.name === 'string' ? b.name : b.name.en || b.code}
                </option>
              ))}
            </select>
          </div>

          <ChevronRight size={13} className="text-slate-300 shrink-0" />

          {/* Floor */}
          <div className="flex items-center gap-1 bg-blue-50/80 border border-blue-200 rounded-lg px-2 py-1">
            <Layers size={13} className="text-blue-700 shrink-0" />
            <select
              value={activeFloorId}
              onChange={e => handleSelectFloor(e.target.value)}
              className="bg-transparent font-bold text-blue-800 text-xs focus:outline-none cursor-pointer"
              title="Floor Level"
            >
              {floors.map(f => (
                <option key={f.id} value={f.id}>
                  {typeof f.name === 'string' ? f.name : (f.name as any).en || f.code} (Lvl {f.level})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center / Right Action Controls */}
        <div className="flex items-center gap-2">
          
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}
              className="p-1.5 rounded text-slate-700 hover:bg-white disabled:opacity-30 transition-colors">
              <Undo2 size={14} />
            </button>
            <button title="Redo (Ctrl+Y)" disabled={!canRedo} onClick={redo}
              className="p-1.5 rounded text-slate-700 hover:bg-white disabled:opacity-30 transition-colors">
              <Redo2 size={14} />
            </button>
          </div>

          {/* Grid Snap Toggle */}
          <button
            title={`Snap to Grid (${isSnapping ? 'On' : 'Off'})`}
            onClick={() => setIsSnapping(!isSnapping)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isSnapping ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Grid3X3 size={13} />
            <span>Snap</span>
          </button>

          {/* Fit to View & Zoom */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={triggerFitToView}
              title="Fit to View (F)"
              className="p-1.5 rounded hover:bg-white text-slate-700 transition-colors"
            >
              <Maximize2 size={13} />
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <button title="Zoom Out (-)" onClick={() => setZoom(z => Math.max(z - 10, 25))} className="p-1.5 rounded text-slate-700 hover:bg-white transition-colors">
              <ZoomOut size={13} />
            </button>
            <button title="Reset Zoom (0)" onClick={() => setZoom(100)} className="px-1.5 text-xs font-mono text-slate-800 hover:bg-white rounded transition-colors">
              {zoom}%
            </button>
            <button title="Zoom In (+)" onClick={() => setZoom(z => Math.min(z + 10, 300))} className="p-1.5 rounded text-slate-700 hover:bg-white transition-colors">
              <ZoomIn size={13} />
            </button>
          </div>

          {/* Layers Toggle */}
          <button
            onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isLayerPanelOpen ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Layers size={14} />
            <span>Layers</span>
          </button>

          {/* Validation Status Badge */}
          <button
            onClick={() => setIsValidationPanelOpen(!isValidationPanelOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              validationReport.isValid && validationReport.warnings.length === 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                : validationReport.errors.length > 0
                ? 'bg-red-50 border-red-200 text-red-700 animate-pulse font-semibold'
                : 'bg-amber-50 border-amber-200 text-amber-700 font-semibold'
            }`}
          >
            {validationReport.isValid && validationReport.warnings.length === 0 ? (
              <ShieldCheck size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            <span>
              {validationReport.errors.length + validationReport.warnings.length === 0
                ? 'Valid'
                : `${validationReport.errors.length + validationReport.warnings.length} Issues`}
            </span>
          </button>

          {/* Import & Export */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={() => setIsImportExportModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white rounded transition-colors"
              title="Import or Export Map Geometry (GeoJSON, SVG, JSON)"
            >
              <Download size={13} className="text-blue-600" />
              <span>Import / Export</span>
            </button>
          </div>

          {/* Preview Mode */}
          <button
            title="Preview Mode"
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              showPreview ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>

          {/* Calibration / Settings */}
          <button
            title="Map Settings & Scale Calibration"
            onClick={() => setShowCalibration(true)}
            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all"
          >
            <Settings2 size={15} />
          </button>

          {/* Save Button with Unsaved Alert Badge */}
          <button
            onClick={performSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
              saveStatus === 'unsaved'
                ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-300 animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Save size={13} />
            <span>Save</span>
            {saveStatus === 'unsaved' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
          </button>
        </div>
      </div>

      {/* ── MAIN 3-PANE LAYOUT ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* LEFT: Object Palette & Drawing Tools */}
        <ObjectPalette 
          onSelectType={handleSelectType} 
          activeTypeId={activeType?.id || null} 
          campusId={activeCampusId} 
          floorId={activeFloorId} 
          placedObjectIds={shapes.map(s => s.objectId).filter(Boolean) as string[]}
          onSelectUnplaced={handleSelectUnplaced}
          activeTool={tool}
          onSelectTool={setTool}
          nodeTypeToCreate={nodeTypeToCreate}
          onSelectNodeType={setNodeTypeToCreate}
        />

        {/* CENTER: Canvas */}
        <div className="flex-1 flex flex-col min-w-0 relative">

          {/* Active Tool Helper Banners */}
          {tool === 'add_edge' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-purple-700 text-white text-xs font-medium px-4 py-1.5 rounded-full shadow-xl">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Click a source waypoint, then click target waypoint to connect path (Esc to cancel)</span>
            </div>
          )}

          {tool === 'add_node' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-emerald-700 text-white text-xs font-medium px-4 py-1.5 rounded-full shadow-xl">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Click anywhere on the floor plan to place a <strong>{nodeTypeToCreate}</strong> waypoint</span>
            </div>
          )}

          {/* Preview overlay banner */}
          {showPreview && (
            <div className="absolute inset-0 z-20 pointer-events-none border-4 border-emerald-400">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                PREVIEW MODE — Interactive Inspection
              </div>
            </div>
          )}

          {/* Floating Panels: Layers & Validation */}
          <LayerPanel
            layers={layers}
            onToggleLayer={handleToggleLayer}
            isOpen={isLayerPanelOpen}
            onClose={() => setIsLayerPanelOpen(false)}
            counts={{
              objects: shapes.length,
              nodes: floorNodes.length,
              edges: campusConnections.length,
              warnings: validationReport.errors.length + validationReport.warnings.length,
            }}
          />

          <ValidationPanel
            report={validationReport}
            isOpen={isValidationPanelOpen}
            onClose={() => setIsValidationPanelOpen(false)}
            onSelectEntity={(entityId, category) => {
              if (category === 'node') {
                const node = floorNodes.find(n => n.id === entityId);
                if (node) {
                  setSelectedNode(node);
                  setSelectedIds([]);
                  setSelectedEdge(null);
                }
              } else if (category === 'object') {
                const shape = shapes.find(s => s.objectId === entityId || s.id === entityId);
                if (shape) {
                  setSelectedIds([shape.id]);
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }
              }
            }}
          />

          {/* Central Canvas Stage */}
          <div className="flex-1 w-full h-full relative overflow-hidden">
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

              // Graph Network
              nodes={floorNodes}
              connections={campusConnections}
              layers={layers}
              activeCampusId={activeCampusId}
              activeBuildingId={activeBuildingId}
              activeFloorId={activeFloorId}
              onNodeCreated={(node) => {
                createNode(node);
                setSelectedNode(node);
                setSaveStatus('unsaved');
              }}
              onNodeUpdated={(id, patch) => {
                updateNode(id, patch);
                setSaveStatus('unsaved');
              }}
              onNodeSelected={(node) => {
                setSelectedNode(node);
                setSelectedIds([]);
                setSelectedEdge(null);
              }}
              onEdgeCreated={(edge) => {
                createConnection(edge);
                setSelectedEdge(edge);
                setSaveStatus('unsaved');
              }}
              onEdgeSelected={(edge) => {
                setSelectedEdge(edge);
                setSelectedIds([]);
                setSelectedNode(null);
              }}
              selectedNodeId={selectedNode?.id}
              selectedEdgeId={selectedEdge?.id}
              validationIssues={[...validationReport.errors, ...validationReport.warnings]}
              zoom={zoom}
              onZoomChange={setZoom}
              nodeTypeToCreate={nodeTypeToCreate}

              // Reference Floor Plan Image Layer
              floorplanImageUrl={floorPlanUrl}
              overlayConfig={floorOverlay}
              onOverlayConfigChange={handleUpdateFloorOverlay}
              fitToViewTrigger={fitToViewTrigger}
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

          {/* ── BOTTOM STATUS BAR ────────────────────────────────────────── */}
          <div className="bg-white border-t border-slate-200 px-4 py-1.5 flex items-center gap-5 text-[11px] font-mono text-slate-500 shrink-0">
            <span>
              <span className="text-slate-400">X:</span> <strong className="text-slate-700">{formatLength(coordXM, calibration.unitSystem)}</strong>
              {'  '}<span className="text-slate-400">Y:</span> <strong className="text-slate-700">{formatLength(coordYM, calibration.unitSystem)}</strong>
            </span>
            <span><span className="text-slate-400">Grid:</span> {formatLength(pxToMeters(gridSize, calibration), calibration.unitSystem)}</span>
            <span><span className="text-slate-400">Objects:</span> {shapes.length}</span>
            <span><span className="text-slate-400">Nodes:</span> {floorNodes.length}</span>
            <span><span className="text-slate-400">Paths:</span> {campusConnections.length}</span>
            {selectedIds.length > 0 && (
              <span className="text-blue-600 font-semibold"><span className="text-blue-400">Selected:</span> {selectedIds.length}</span>
            )}
            {selectedNode && (
              <span className="text-emerald-600 font-semibold">Node: <strong>{selectedNode.label || selectedNode.type}</strong></span>
            )}
            {selectedEdge && (
              <span className="text-purple-600 font-semibold">Path: <strong>{selectedEdge.name}</strong></span>
            )}
            <div className="flex-1" />
            <span className="uppercase tracking-widest text-slate-400 font-semibold">{tool}</span>
            <span className="text-slate-400">Snap: {isSnapping ? <span className="text-indigo-600 font-bold">ON</span> : 'OFF'}</span>

            {/* Save Status */}
            <div className="flex items-center gap-1.5 min-w-[90px]">
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 size={12} /> Saved {lastSaved ? lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              )}
              {saveStatus === 'unsaved' && (
                <span className="flex items-center gap-1 text-amber-600 font-bold">
                  <AlertTriangle size={12} /> Unsaved changes
                </span>
              )}
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-blue-600 font-medium animate-pulse">
                  <Clock size={12} /> Saving…
                </span>
              )}
            </div>
            
            <button 
              onClick={() => document.getElementById('editor-sidebar')?.classList.toggle('hidden')}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 transition-colors"
            >
              Toggle Panel
            </button>
          </div>
        </div>

        {/* RIGHT: Properties Sidebar */}
        <div id="editor-sidebar" className="flex flex-col h-full z-10 shrink-0">
          <EditorSidebar
            selectedShapes={selectedShapes}
            updateShape={updateShape}
            onDuplicate={handleDuplicate}
            onBulkDelete={() => setPendingDelete(true)}
            onBulkAlign={handleBulkAlign}
            calibration={calibration}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onUpdateNode={(id, patch) => {
              updateNode(id, patch);
              setSaveStatus('unsaved');
            }}
            onDeleteNode={(id) => {
              deleteNode(id);
              setSelectedNode(null);
              setSaveStatus('unsaved');
            }}
            onUpdateEdge={(id, patch) => {
              updateConnection(id, patch);
              setSaveStatus('unsaved');
            }}
            onDeleteEdge={(id) => {
              deleteConnection(id);
              setSelectedEdge(null);
              setSaveStatus('unsaved');
            }}
            availableNodes={floorNodes}
            activeFloor={activeFloor}
            activeBuilding={activeBuilding}
            activeCampus={activeCampus}
            onUpdateFloorOverlay={handleUpdateFloorOverlay}
            onFitToView={triggerFitToView}
            totalStats={{
              shapesCount: shapes.length,
              nodesCount: floorNodes.length,
              edgesCount: campusConnections.length,
            }}
          />
        </div>
      </div>

      {/* ── DELETE CONFIRMATION MODAL ───────────────────────────────────── */}
      {pendingDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Delete {selectedIds.length} object{selectedIds.length !== 1 ? 's' : ''}?</h3>
                <p className="text-xs text-slate-500 mt-1">This will remove the selected shapes and synchronize with the campus database.</p>
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

      {/* Import / Export Modal */}
      <MapImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        shapes={shapes}
        nodes={floorNodes}
        connections={campusConnections}
        campusId={activeCampusId}
        buildingId={activeBuildingId}
        floorId={activeFloorId}
        onImportData={handleImportMapData}
      />

      {/* Floor Connector Modal */}
      <FloorConnectorModal
        isOpen={isFloorConnectorModalOpen}
        onClose={() => setIsFloorConnectorModalOpen(false)}
        currentFloorId={activeFloorId}
        campusId={activeCampusId}
        buildingId={activeBuildingId}
        floors={floors}
        nodes={floorNodes}
      />

      {/* Calibration Modal */}
      <MapCalibrationModal
        isOpen={showCalibration}
        onClose={() => setShowCalibration(false)}
        calibration={calibration}
        onChange={setCalibration}
      />
    </div>
  );
};
