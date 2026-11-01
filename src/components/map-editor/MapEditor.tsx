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
import { objectStore } from '../../api/object.store';
import { MapObject } from '../../types/object';
import { navStore } from '../../api/nav.store';
import { CanvasStage } from './CanvasStage';
import { EditorSidebar } from './EditorSidebar';
import { ObjectPalette } from './ObjectPalette';
import { MapCalibrationModal } from './MapCalibrationModal';
import { MeasurementOverlay } from './MeasurementOverlay';
import { LayerPanel } from './LayerPanel';
import { ValidationPanel } from './ValidationPanel';
import { FloorConnectorModal } from './FloorConnectorModal';
import { ElementsPanel } from './ElementsPanel';
import { svgToDataUrl } from '../../data/map-elements';
import { MapImportExportModal } from './MapImportExportModal';
import { validateCampusGraph } from '../../utils/graph-validation';
import { CampusGraphGenerator } from '../../api/graph-generator.service';
import { ObjectType } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import {
  Settings2, CheckCircle2, Clock, AlertTriangle,
  Undo2, Redo2, Trash2, Grid3X3,
  ZoomIn, ZoomOut, Eye, Save, ChevronRight, DoorOpen, Layers,
  ShieldCheck, Maximize2, Download,
  Landmark, Building2, HelpCircle, Keyboard, X, Sparkles, LayoutGrid
} from 'lucide-react';

interface MapEditorProps {
  floorId?: string;
  campusId?: string;
  buildingId?: string;
  campus?: Campus | null;
  roomId?: string;
}

export const MapEditor: React.FC<MapEditorProps> = ({
  floorId: propFloorId,
  campusId: propCampusId,
  buildingId: propBuildingId,
  roomId: propRoomId,
}) => {
  // â”€â”€ Left Panel Tab State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [leftPanelTab, setLeftPanelTab] = useState<'tools' | 'elements'>('tools');
  /** Stage viewport â€“ kept in sync via onViewportChange so ElementsPanel can compute drop coords */
  const [stageViewport, setStageViewport] = useState<{ scale: number; position: { x: number; y: number } }>({
    scale: 1,
    position: { x: 0, y: 0 },
  });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // â”€â”€ Hierarchy State (Campus, Building, Floor) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);

  const [activeCampusId, setActiveCampusId] = useState<string>(propCampusId || '');
  const [activeBuildingId, setActiveBuildingId] = useState<string>(propBuildingId || '');
  const [activeFloorId, setActiveFloorId] = useState<string>(propFloorId || '');
  const [activeRoomId, setActiveRoomId] = useState<string>(propRoomId || '');
  const [roomObject, setRoomObject] = useState<MapObject | null>(null);

  // Sync propRoomId
  useEffect(() => {
    if (propRoomId !== activeRoomId) {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      setShapes([]);
      prevShapesHash.current = '';
      setActiveRoomId(propRoomId || '');
    }
  }, [propRoomId]);

  // Load room details if activeRoomId is set
  useEffect(() => {
    if (activeRoomId) {
      const obj = objectStore.getById(activeRoomId);
      setRoomObject(obj || null);
    } else {
      setRoomObject(null);
    }
  }, [activeRoomId]);

  // Keep internal selection synced when route or props change
  useEffect(() => {
    if (propCampusId && propCampusId !== activeCampusId) {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      setShapes([]);
      prevShapesHash.current = '';
      setActiveCampusId(propCampusId);
    }
  }, [propCampusId]);

  useEffect(() => {
    if (propBuildingId && propBuildingId !== activeBuildingId) {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      setShapes([]);
      prevShapesHash.current = '';
      setActiveBuildingId(propBuildingId);
    }
  }, [propBuildingId]);

  useEffect(() => {
    if (propFloorId && propFloorId !== activeFloorId) {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      setShapes([]);
      prevShapesHash.current = '';
      setActiveFloorId(propFloorId);
    }
  }, [propFloorId]);

  // Load campus hierarchy
  useEffect(() => {
    campusService.getCampuses().then(res => {
      if (res.success && res.data.length > 0) {
        setCampuses(res.data);
        if (!activeCampusId || !res.data.some(c => c.id === activeCampusId)) {
          const match = propCampusId && res.data.some(c => c.id === propCampusId) ? propCampusId : res.data[0].id;
          setActiveCampusId(match);
        }
      }
    });
  }, [propCampusId]);

  useEffect(() => {
    if (!activeCampusId) {
      setBuildings([]);
      setActiveBuildingId('');
      setFloors([]);
      setActiveFloorId('');
      return;
    }
    campusService.getBuildingsByCampus(activeCampusId).then(res => {
      if (res.success && res.data) {
        setBuildings(res.data);
        if (propBuildingId) {
          const matchProp = res.data.find(b => b.id === propBuildingId)?.id;
          setActiveBuildingId(matchProp || res.data[0]?.id || '');
        } else {
          // Stay on Campus Overview when no specific building was requested in props
          setActiveBuildingId('');
        }
      }
    });
  }, [activeCampusId, propBuildingId]);

  useEffect(() => {
    if (!activeBuildingId) {
      setFloors([]);
      setActiveFloorId('');
      return;
    }
    campusService.getFloorsByBuilding(activeBuildingId).then(res => {
      if (res.success && res.data) {
        setFloors(res.data);
        if (propFloorId) {
          const matchProp = res.data.find(f => f.id === propFloorId)?.id;
          setActiveFloorId(matchProp || res.data[0]?.id || '');
        } else {
          // If a building is selected in dropdown without floor prop, default to its ground floor
          const ground = res.data.find(f => f.level === 0 || f.level === 1) || res.data[0];
          setActiveFloorId(ground?.id || '');
        }
      }
    });
  }, [activeBuildingId, propFloorId]);

  const activeCampus = useMemo(() => campuses.find(c => c.id === activeCampusId) || null, [campuses, activeCampusId]);
  const activeBuilding = useMemo(() => buildings.find(b => b.id === activeBuildingId) || null, [buildings, activeBuildingId]);
  const activeFloor = useMemo(() => floors.find(f => f.id === activeFloorId) || null, [floors, activeFloorId]);

  // â”€â”€ Floor Plan Reference Image & Overlay State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Unified Stores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const {
    nodes: rawFloorNodes,
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

  // â”€â”€ Editor Tools & Selection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [tool, setTool] = useState<EditorTool>('select');
  const [activeType, setActiveType] = useState<ObjectType | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<SpatialNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<CampusConnection | null>(null);
  const [nodeTypeToCreate, setNodeTypeToCreate] = useState<SpatialNodeType>('hallway');

  // Right sidebar open/closed (React-controlled, replaces DOM classList hack)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-open sidebar and clear node/edge selection whenever shapes are selected
  useEffect(() => {
    if (selectedIds.length > 0) {
      setIsSidebarOpen(true);
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  }, [selectedIds]);

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
  // Keyboard shortcut help overlay
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  // Open floor connector modal when connect_floors tool is selected
  useEffect(() => {
    if (tool === 'connect_floors') {
      setIsFloorConnectorModalOpen(true);
      setTool('select');
    }
  }, [tool]);

  // Snapping & Measurement & Fit-to-View
  const [isSnapping, setIsSnapping] = useState(true);
  const [gridSize] = useState(20);
  // In room interior mode, use fine 4px grid (~30cm) for minute detail placement
  const activeGridSize = activeRoomId ? 4 : gridSize;
  const [pointerCoords, setPointerCoords] = useState<Point2D>({ x: 0, y: 0 });
  const [calibration, setCalibration] = useState<MapCalibration>(DEFAULT_CALIBRATION);
  // Ref to read calibration inside effects without creating dependency cycles
  const calibrationRef = useRef<MapCalibration>(DEFAULT_CALIBRATION);
  useEffect(() => { calibrationRef.current = calibration; }, [calibration]);

  // Restore floor calibration when leaving room interior mode
  useEffect(() => {
    if (!activeRoomId) {
      if (activeFloor) {
        setCalibration({
          ...DEFAULT_CALIBRATION,
          realWidthMeters: activeFloor.dimensions.widthMeters,
          realHeightMeters: activeFloor.dimensions.heightMeters,
        });
      } else {
        setCalibration(DEFAULT_CALIBRATION);
      }
    }
  }, [activeRoomId, activeFloor]);
  const [showCalibration, setShowCalibration] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingObjectId, setPendingObjectId] = useState<string | null>(null);
  const [fitToViewTrigger, setFitToViewTrigger] = useState(0);

  const [draftMeasure, setDraftMeasure] = useState<{
    x: number; y: number; w: number; h: number; type: 'polygon' | 'polyline' | 'point' | null; visible: boolean;
  }>({ x: 0, y: 0, w: 0, h: 0, type: null, visible: false });

  // Shapes with undo/redo
  const { state: shapes, set: setShapes, undo, redo, canUndo, canRedo, clearHistory } = useHistory([]);

  // When editing building ground floor (level 0), project campus entrances onto outer dashed perimeter
  const floorNodes = useMemo(() => {
    if (activeRoomId) {
      return [];
    }
    if (!activeBuildingId) {
      return rawFloorNodes;
    }
    const isGround = !activeFloor || activeFloor.level === 0;
    if (!isGround) return rawFloorNodes;

    const buildingNodes = navStore.getNodesByBuilding(activeBuildingId);
    const buildingEntrances = buildingNodes.filter(n => n.type === 'entrance' || n.type === 'outdoor_waypoint');

    // Retrieve building shape from outer campus map to know its bounding box
    let buildingShape: EditorShape | null = null;
    const campusKeys = [`editor-shapes-${activeCampusId}`, `editor-shapes-${activeCampusId}--`];
    for (const ck of campusKeys) {
      const raw = localStorage.getItem(ck);
      if (raw) {
        try {
          const arr: EditorShape[] = JSON.parse(raw);
          const activeBldName = activeBuilding ? (typeof (activeBuilding as any).name === 'string' ? (activeBuilding as any).name.toLowerCase() : (activeBuilding.name?.en || '').toLowerCase()) : '';
          const found = arr.find(s => s.objectId === activeBuildingId || s.id === activeBuildingId || (activeBldName && s.name.toLowerCase().includes(activeBldName)));
          if (found) { buildingShape = found; break; }
        } catch {}
      }
    }

    const W = calibration.canvasWidthPx || 1200;
    const H = calibration.canvasHeightPx || 960;

    // Project entrance positions along the outer dashed perimeter lines of the floor map (Image 3)
    const projectedEntrances = buildingEntrances.map(n => {
      if (!buildingShape) return n;

      const bx = buildingShape.x;
      const by = buildingShape.y;
      const bw = buildingShape.width || 120;
      const bh = buildingShape.height || 100;

      // Distance from entrance node to each edge of the building shape on the campus map
      const distTop = Math.abs(n.coordinates.y - by);
      const distBottom = Math.abs(n.coordinates.y - (by + bh));
      const distLeft = Math.abs(n.coordinates.x - bx);
      const distRight = Math.abs(n.coordinates.x - (bx + bw));
      const minDist = Math.min(distTop, distBottom, distLeft, distRight);

      // Relative position along the building width (0 to 1) and height (0 to 1)
      const relX = Math.max(0.12, Math.min(0.88, (n.coordinates.x - bx) / bw));
      const relY = Math.max(0.12, Math.min(0.88, (n.coordinates.y - by) / bh));

      let px = n.coordinates.x;
      let py = n.coordinates.y;

      if (minDist === distBottom) {
        // Bottom dashed edge (e.g. Main Entrance at bottom-center)
        px = relX * W;
        py = H - 6;
      } else if (minDist === distTop) {
        // Top dashed edge (e.g. Side Entrances at top edge)
        px = relX * W;
        py = 6;
      } else if (minDist === distLeft) {
        // Left dashed edge
        px = 6;
        py = relY * H;
      } else {
        // Right dashed edge
        px = W - 6;
        py = relY * H;
      }

      return {
        ...n,
        coordinates: { x: Math.round(px), y: Math.round(py) }
      };
    });

    const map = new Map(rawFloorNodes.map(n => [n.id, n]));
    projectedEntrances.forEach(n => {
      if (!map.has(n.id)) map.set(n.id, n);
    });

    return Array.from(map.values());
  }, [rawFloorNodes, activeBuildingId, activeFloor, activeCampusId, activeBuilding, calibration]);

  // Autosave & Persistence tracking
  const getStorageKey = useCallback(() => {
    if (activeRoomId) {
      return `editor-shapes-${activeCampusId}-${activeBuildingId}-${activeFloorId}-${activeRoomId}`;
    }
    return `editor-shapes-${activeCampusId}-${activeBuildingId}-${activeFloorId}`;
  }, [activeCampusId, activeBuildingId, activeFloorId, activeRoomId]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevShapeCount = useRef(0);
  const [pendingDelete, setPendingDelete] = useState(false);
  // Stable JSON snapshot of shapes for change detection (not just count)
  const prevShapesHash = useRef<string>('');

  // Load from local storage or hydrate from objectStore
  useEffect(() => {
    // If no campus is selected or if a floor route is waiting for floorId, keep canvas clear
    if (!activeCampusId || (propFloorId && !activeFloorId) || (propRoomId && !activeRoomId)) {
      clearHistory([]);
      prevShapeCount.current = 0;
      prevShapesHash.current = '[]';
      return;
    }

    const key = getStorageKey();
    const data = localStorage.getItem(key);

    // Room Interior Mode: shape and entrance must match the floor map definition
    if (activeRoomId) {
      const rObj = objectStore.getById(activeRoomId);
      const rName = (rObj ? (typeof rObj.name === 'string' ? rObj.name : rObj.name?.en) : '') || '';
      const rCode = rObj?.code || '';

      // 1. Search localStorage across possible floor keys for the floor shapes
      let parsedFloor: EditorShape[] = [];
      const floorKeyExact = `editor-shapes-${activeCampusId}-${activeBuildingId}-${activeFloorId}`;
      const directFloorData = localStorage.getItem(floorKeyExact);
      if (directFloorData) {
        try { parsedFloor = JSON.parse(directFloorData); } catch (e) {}
      }
      if (parsedFloor.length === 0) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('editor-shapes-') && k.includes(activeFloorId) && !k.endsWith(activeRoomId)) {
            try {
              const arr = JSON.parse(localStorage.getItem(k) || '[]');
              if (Array.isArray(arr) && arr.length > 0) {
                parsedFloor = arr;
                break;
              }
            } catch (e) {}
          }
        }
      }

      // 2. Find the floor shape that defines this room
      let floorRoomShape: EditorShape | null = null;
      if (parsedFloor.length > 0) {
        floorRoomShape = parsedFloor.find(s => {
          if (s.objectId && s.objectId === activeRoomId) return true;
          if (s.id && s.id === activeRoomId) return true;
          if (s.id && s.id === `shape_${activeRoomId}`) return true;
          const sName = (s.name || '').toLowerCase().trim();
          if (rName && sName === rName.toLowerCase().trim()) return true;
          if (rCode && sName === rCode.toLowerCase().trim()) return true;
          if (rName && (sName.includes(rName.toLowerCase().trim()) || rName.toLowerCase().trim().includes(sName))) return true;
          return false;
        }) || null;
      }

      // 3. Find the entrance door position on the floor map
      let floorDoorPt: { x: number; y: number } | null = null;
      if (floorRoomShape) {
        const assocNodeId = floorRoomShape.attributes?.associatedNodeId;
        const assocNodeIds = floorRoomShape.attributes?.entranceNodeIds || [];
        const campusNodes = navStore.getNodesByCampus(activeCampusId);
        let doorNode = campusNodes.find(n =>
          n.id === assocNodeId ||
          assocNodeIds.includes(n.id) ||
          n.associatedObjectId === activeRoomId
        );

        if (!doorNode && rName) {
          doorNode = campusNodes.find(n =>
            n.floorId === activeFloorId &&
            n.type === 'entrance' &&
            n.label && n.label.toLowerCase().includes(rName.toLowerCase())
          );
        }

        if (doorNode) {
          floorDoorPt = { x: doorNode.coordinates.x, y: doorNode.coordinates.y };
        } else {
          // Search in parsedFloor for entrance shapes near floorRoomShape
          const doorShape = parsedFloor.find(s =>
            (s.objectTypeId === 'entrance' || s.objectTypeId === 'door' || /door|entrance/i.test(s.name)) &&
            Math.hypot((s.x - floorRoomShape!.x), (s.y - floorRoomShape!.y)) < 300
          );
          if (doorShape) floorDoorPt = { x: doorShape.x, y: doorShape.y };
        }
      }

      // 4. Calculate Room Editor Canvas dimensions matching the room's exact shape
      let fw = floorRoomShape?.width || 240;
      let fh = floorRoomShape?.height || 160;
      const isPolygon = floorRoomShape?.geometryType === 'polygon' && Boolean(floorRoomShape.points && floorRoomShape.points.length >= 6);
      let polyPoints = floorRoomShape?.points || [];

      if (isPolygon) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < polyPoints.length; i += 2) {
          minX = Math.min(minX, polyPoints[i]);
          maxX = Math.max(maxX, polyPoints[i]);
          minY = Math.min(minY, polyPoints[i + 1]);
          maxY = Math.max(maxY, polyPoints[i + 1]);
        }
        fw = Math.max(40, maxX - minX);
        fh = Math.max(40, maxY - minY);
      }

      // Compute Canvas Width & Height so the editor boundary IS the room's shape
      let canvasW: number;
      let canvasH: number;
      if (fw <= fh) {
        // Vertical room (e.g. Soil Lab)
        canvasH = 1000;
        canvasW = Math.max(240, Math.round(1000 * (fw / fh)));
      } else {
        // Horizontal room
        canvasW = 1200;
        canvasH = Math.max(240, Math.round(1200 * (fh / fw)));
      }

      // Update calibration so CanvasStage grid & dashed boundary match the room shape
      const pxPerM = 12; // Standard scale
      const rwM = Math.max(3, Math.round(fw / pxPerM));
      const rhM = Math.max(3, Math.round(fh / pxPerM));
      if (
        calibrationRef.current.canvasWidthPx !== canvasW ||
        calibrationRef.current.canvasHeightPx !== canvasH ||
        calibrationRef.current.realWidthMeters !== rwM ||
        calibrationRef.current.realHeightMeters !== rhM
      ) {
        setCalibration({
          unitSystem: 'metric',
          canvasWidthPx: canvasW,
          canvasHeightPx: canvasH,
          realWidthMeters: rwM,
          realHeightMeters: rhM,
        });
      }

      // 5. Build Room Boundary shape [0, 0, canvasW, canvasH]
      let roomPoints: number[] = [];
      if (isPolygon) {
        let minX = Infinity, minY = Infinity;
        for (let i = 0; i < polyPoints.length; i += 2) {
          minX = Math.min(minX, polyPoints[i]);
          minY = Math.min(minY, polyPoints[i + 1]);
        }
        const scaleX = canvasW / fw;
        const scaleY = canvasH / fh;
        for (let i = 0; i < polyPoints.length; i += 2) {
          roomPoints.push(
            Math.round((polyPoints[i] - minX) * scaleX),
            Math.round((polyPoints[i + 1] - minY) * scaleY)
          );
        }
      }

      // 6. Compute Entrance Door position on the room boundary matching the floor map
      let doorX = Math.round(canvasW / 2);
      let doorY = canvasH; // default: bottom center

      if (floorRoomShape && floorDoorPt) {
        const bx = floorRoomShape.x;
        const by = floorRoomShape.y;
        const bw = floorRoomShape.width || 240;
        const bh = floorRoomShape.height || 160;

        const distTop = Math.abs(floorDoorPt.y - by);
        const distBottom = Math.abs(floorDoorPt.y - (by + bh));
        const distLeft = Math.abs(floorDoorPt.x - bx);
        const distRight = Math.abs(floorDoorPt.x - (bx + bw));
        const minDist = Math.min(distTop, distBottom, distLeft, distRight);

        if (minDist === distBottom) {
          const rel = Math.max(0.06, Math.min(0.94, (floorDoorPt.x - bx) / bw));
          doorX = Math.round(rel * canvasW);
          doorY = canvasH;
        } else if (minDist === distTop) {
          const rel = Math.max(0.06, Math.min(0.94, (floorDoorPt.x - bx) / bw));
          doorX = Math.round(rel * canvasW);
          doorY = 0;
        } else if (minDist === distLeft) {
          const rel = Math.max(0.06, Math.min(0.94, (floorDoorPt.y - by) / bh));
          doorX = 0;
          doorY = Math.round(rel * canvasH);
        } else {
          // Right wall
          const rel = Math.max(0.06, Math.min(0.94, (floorDoorPt.y - by) / bh));
          doorX = canvasW;
          doorY = Math.round(rel * canvasH);
        }
      }

      const initialRoomShapes: EditorShape[] = [
        {
          id: `room_boundary_${activeRoomId}`,
          objectTypeId: 'room_boundary',
          geometryType: isPolygon ? 'polygon' : ('rectangle' as any),
          x: 0,
          y: 0,
          width: canvasW,
          height: canvasH,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          points: roomPoints,
          name: `${rName || 'Room'} Perimeter Walls`,
          color: '#3b82f6',
          isLocked: true,
          attributes: { isRoomPerimeter: true },
        },
        {
          id: `room_door_${activeRoomId}`,
          objectTypeId: 'entrance',
          geometryType: 'point',
          x: doorX,
          y: doorY,
          width: 24,
          height: 24,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          points: [],
          name: `${rName || 'Room'} Entrance Door`,
          color: '#10b981',
          attributes: { isDoor: true, isEntrance: true },
        },
      ];

      // 7. Load or adapt existing room interior shapes
      if (data) {
        try {
          const parsed: EditorShape[] = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Keep any interior shapes (cabins, desks, furniture, partitions), but enforce matching boundary & door
            const interiorItems = parsed.filter(s =>
              s.id !== `room_boundary_${activeRoomId}` &&
              s.id !== `room_door_${activeRoomId}` &&
              !s.attributes?.isRoomPerimeter
            );
            const combinedShapes = [...initialRoomShapes, ...interiorItems];
            clearHistory(combinedShapes);
            prevShapeCount.current = combinedShapes.length;
            prevShapesHash.current = JSON.stringify(combinedShapes);
            setSaveStatus('saved');
            setFitToViewTrigger(v => v + 1);
            return;
          }
        } catch (e) {}
      }

      clearHistory(initialRoomShapes);
      prevShapeCount.current = initialRoomShapes.length;
      prevShapesHash.current = JSON.stringify(initialRoomShapes);
      setSaveStatus('unsaved');
      setFitToViewTrigger(v => v + 1);
      return;
    }
    if (data) {
      try {
        const parsed = JSON.parse(data);
        clearHistory(parsed);
        prevShapeCount.current = parsed.length;
        prevShapesHash.current = JSON.stringify(parsed);
        setSaveStatus('saved');
        return;
      } catch (e) {
        console.error('Failed to parse saved shapes');
      }
    }

    // Fallback: ONLY hydrate shapes from objectStore objects on THIS specific floor
    if (activeFloorId) {
      const currentFloorObjs = objectStore.getByFloor(activeFloorId);
      if (currentFloorObjs.length > 0) {
        const pxPerM = calibrationRef.current.canvasWidthPx / calibrationRef.current.realWidthMeters;
        const hydratedShapes: EditorShape[] = currentFloorObjs.map((obj: MapObject) => {
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
        clearHistory(hydratedShapes);
        prevShapeCount.current = hydratedShapes.length;
        prevShapesHash.current = JSON.stringify(hydratedShapes);
        setSaveStatus('saved');
        return;
      }
    }

    setShapes([]);
    prevShapeCount.current = 0;
    prevShapesHash.current = '[]';
    setSaveStatus('saved');
  }, [getStorageKey, activeFloorId, activeCampusId, propFloorId, activeRoomId]);

  // Mark unsaved when shapes change (hash-based, not just count)
  useEffect(() => {
    const hash = JSON.stringify(shapes);
    if (hash !== prevShapesHash.current) {
      // Only fire 'unsaved' after the initial load (hash will be '' then)
      if (prevShapesHash.current !== '') {
        setSaveStatus('unsaved');
      }
      prevShapesHash.current = hash;
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
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    // Clear shapes immediately so no stale data bleeds into the new campus
    setShapes([]);
    prevShapesHash.current = '';
    setActiveCampusId(newCampusId);
    setActiveBuildingId('');
    setActiveFloorId('');
  };

  const handleSelectBuilding = (newBuildingId: string) => {
    if (saveStatus === 'unsaved') {
      const ok = window.confirm('You have unsaved changes on this floor. Discard and switch building?');
      if (!ok) return;
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    // Clear shapes immediately so no stale data bleeds into the new building
    clearHistory([]);
    prevShapesHash.current = '';
    setActiveBuildingId(newBuildingId);
    setActiveFloorId('');
  };

  const handleSelectFloor = (newFloorId: string) => {
    if (saveStatus === 'unsaved') {
      const ok = window.confirm('You have unsaved changes on this floor. Discard and switch floor?');
      if (!ok) return;
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    // Clear shapes immediately so no stale data bleeds into the new floor
    clearHistory([]);
    prevShapesHash.current = '';
    setActiveFloorId(newFloorId);
  };

  // Persist shapes & floor overlay through backend
  const performSave = useCallback(async () => {
    if (!activeCampusId) return;
    if (propFloorId && !activeFloorId) return;
    setSaveStatus('saving');

    // 1. Save shapes to localStorage
    localStorage.setItem(getStorageKey(), JSON.stringify(shapes));

    // 2. Persist shapes into objectStore
    shapes.forEach(shape => {
      if (shape.objectId) {
        try {
          updateObject(shape.objectId, {
            name: { en: shape.name },
            coordinates: {
              x: Math.max(0, shape.realWorld?.originXMeters ?? pxToMeters(Math.max(0, shape.x), calibration)),
              y: Math.max(0, shape.realWorld?.originYMeters ?? pxToMeters(Math.max(0, shape.y), calibration)),
            },
            associatedNodeId: shape.attributes?.associatedNodeId,
            attributes: shape.attributes,
          });
        } catch (err) {
          console.warn('Defensively caught coordinate save error:', err);
        }
      }
    });

    // 3. Persist floor reference blueprint image and overlay configuration to backend
    if (activeFloorId) {
      await campusService.updateFloor(activeFloorId, {
        planImageUrl: floorPlanUrl,
        overlayConfig: floorOverlay,
      });
    }

    // 4. Auto-generate and sync navigation graph from drawn shapes and paths
    try {
      const allBuildingNodes = activeBuildingId ? navStore.getNodesByBuilding(activeBuildingId) : floorNodes;
      const allCampusConnections = activeCampusId ? navStore.getConnectionsByCampus(activeCampusId) : campusConnections;
      const res = CampusGraphGenerator.generateGraph(
        activeCampusId,
        activeFloorId,
        activeBuildingId,
        shapes,
        allBuildingNodes,
        allCampusConnections,
        floorObjects,
        calibration,
        {
          snapToleranceMeters: 0.8,
          doorSnapToleranceMeters: 8.0,
          preserveMetadata: true,
          autoAssociateRooms: true,
          autoConnectFloorTransitions: true,
        }
      );
      if (res && res.nodes && res.nodes.length > 0) {
        navStore.setNodesAndConnections(res.nodes, res.connections);
        res.updatedObjects.forEach(obj => {
          updateObject(obj.id, {
            associatedNodeId: obj.associatedNodeId,
            entranceNodeIds: obj.entranceNodeIds,
          });
        });
      }
    } catch (graphErr) {
      console.warn('Auto graph sync on save warning:', graphErr);
    }

    setSaveStatus('saved');
    setLastSaved(new Date());
  }, [shapes, getStorageKey, updateObject, calibration, activeFloorId, floorPlanUrl, floorOverlay, activeBuildingId, activeCampusId, floorNodes, campusConnections, floorObjects]);

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
          case 'l': setTool('path'); break;
          case 'w': setTool('wall'); break;
          case 'm': setTool('point'); break;
          case 'n': setTool('add_node'); break;
          case 'e': setTool('add_edge'); break;
          case 'f': triggerFitToView(); e.preventDefault(); break;
          case '+': setZoom(z => Math.min(z + 10, 300)); break;
          case '-': setZoom(z => Math.max(z - 10, 25)); break;
          case '0': setZoom(100); break;
          case '?': setShowShortcutHelp(h => !h); e.preventDefault(); break;
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

  // Automated & Incremental Navigation Graph Generator
  const handleGenerateGraph = useCallback(() => {
    const allBuildingNodes = activeBuildingId ? navStore.getNodesByBuilding(activeBuildingId) : floorNodes;
    const allCampusConnections = activeCampusId ? navStore.getConnectionsByCampus(activeCampusId) : campusConnections;

    const res = CampusGraphGenerator.generateGraph(
      activeCampusId,
      activeFloorId,
      activeBuildingId,
      shapes,
      allBuildingNodes,
      allCampusConnections,
      floorObjects,
      calibration,
      {
        snapToleranceMeters: 0.8,
        doorSnapToleranceMeters: 5.0,
        preserveMetadata: true,
        autoAssociateRooms: true,
        autoConnectFloorTransitions: true,
      }
    );

    // Update navStore atomically
    navStore.setNodesAndConnections(res.nodes, res.connections);

    // Update objectStore for any newly associated doors
    res.updatedObjects.forEach(obj => {
      updateObject(obj.id, {
        associatedNodeId: obj.associatedNodeId,
        entranceNodeIds: obj.entranceNodeIds,
      });
    });

    // Update shapes with door associations if matched
    setShapes(prev => prev.map(s => {
      const updatedObj = res.updatedObjects.find(uo => uo.id === s.objectId);
      if (updatedObj) {
        return {
          ...s,
          attributes: {
            ...(s.attributes || {}),
            associatedNodeId: updatedObj.associatedNodeId,
            entranceNodeIds: updatedObj.entranceNodeIds,
          },
        };
      }
      return s;
    }));

    setSaveStatus('unsaved');
  }, [activeCampusId, activeFloorId, activeBuildingId, shapes, floorNodes, campusConnections, floorObjects, calibration, updateObject, setShapes]);

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
      if ('x' in updates && updated.x !== undefined) updated.x = Math.max(0, updated.x);
      if ('y' in updates && updated.y !== undefined) updated.y = Math.max(0, updated.y);
      if ('width' in updates || 'height' in updates || 'x' in updates || 'y' in updates) {
        const wM = pxToMeters(Math.max(1, updated.width || 0), calibration);
        const hM = pxToMeters(Math.max(1, updated.height || 0), calibration);
        const xM = Math.max(0, pxToMeters(updated.x, calibration));
        const yM = Math.max(0, pxToMeters(updated.y, calibration));
        updated.realWorld = {
          originXMeters: xM,
          originYMeters: yM,
          widthMeters: wM,
          heightMeters: hM,
          areaM2: wM * hM,
          rotationDeg: updated.rotation,
        };
      }

      if (updated.objectId) {
        try {
          updateObject(updated.objectId, {
            name: { en: updated.name },
            coordinates: {
              x: Math.max(0, updated.realWorld?.originXMeters ?? pxToMeters(updated.x, calibration)),
              y: Math.max(0, updated.realWorld?.originYMeters ?? pxToMeters(updated.y, calibration)),
            },
            associatedNodeId: updated.attributes?.associatedNodeId,
            attributes: updated.attributes,
          });
        } catch (err) {
          console.warn('Defensively caught coordinate update validation error:', err);
        }
      }
      return updated;
    }));
    setSaveStatus('unsaved');
  };

  // Finalize shape -> bridge to objectStore
  const handleShapeFinalized = useCallback((shape: EditorShape) => {
    const safeX = Math.max(0, shape.x);
    const safeY = Math.max(0, shape.y);
    const xM = Math.max(0, pxToMeters(safeX, calibration));
    const yM = Math.max(0, pxToMeters(safeY, calibration));
    const wM = shape.width ? pxToMeters(Math.max(1, shape.width), calibration) : 0;
    const hM = shape.height ? pxToMeters(Math.max(1, shape.height), calibration) : 0;

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
    setTool('select');
  }, [calibration, pendingObjectId, activeCampusId, activeBuildingId, activeFloorId, activeType, createObject, updateObject, setShapes]);

  // â”€â”€ Element Drop Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleElementDrop = useCallback((element: import('../../data/map-elements').MapElement, canvasX: number, canvasY: number) => {
    // 1. In campus/floor mode: Check if dropped on top of an unskinned building/room to skin it.
    // In room interior mode: NEVER skin room perimeter; always place as an interior element at drop position!
    const targetShape = (!activeRoomId) ? shapes.find(s => {
      if (s.isLocked || s.attributes?.isRoomPerimeter || s.objectTypeId === 'room_boundary') return false;
      if (s.geometryType === 'image') return false;
      const sw = s.width || 20;
      const sh = s.height || 20;
      return canvasX >= s.x && canvasX <= (s.x + sw) &&
             canvasY >= s.y && canvasY <= (s.y + sh);
    }) : null;

    if (targetShape) {
      updateShape(targetShape.id, {
        geometryType: 'image',
        elementKey: element.key,
        elementDataUrl: svgToDataUrl(element.svg),
        attributes: {
          ...targetShape.attributes,
          elementKey: element.key,
          elementCategory: element.category,
          elementSubcategory: element.subcategory,
        },
      });
      setSelectedIds([targetShape.id]);
      setSelectedNode(null);
      setSelectedEdge(null);
      setIsSidebarOpen(true);
      setTool('select');
      setSaveStatus('unsaved');
      return;
    }

    // 2. Place as a new element shape on the canvas right at the cursor position
    const newShape: EditorShape = {
      id: uuidv4(),
      objectTypeId: 'element',
      geometryType: 'image' as any,
      x: Math.round(canvasX - element.defaultWidth / 2),
      y: Math.round(canvasY - element.defaultHeight / 2),
      width: element.defaultWidth,
      height: element.defaultHeight,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      points: [],
      name: element.label,
      color: '#6366f1',
      elementKey: element.key,
      elementDataUrl: svgToDataUrl(element.svg),
      attributes: { elementCategory: element.category, elementSubcategory: element.subcategory },
    };
    handleShapeFinalized(newShape);
    setSelectedIds([newShape.id]);
    setSelectedNode(null);
    setSelectedEdge(null);
    setIsSidebarOpen(true);
    setTool('select');
    setSaveStatus('unsaved');
  }, [activeRoomId, shapes, updateShape, handleShapeFinalized]);

  // One-click skinning: when a building shape is selected, clicking any element skins it immediately!
  const handleElementClick = useCallback((element: import('../../data/map-elements').MapElement) => {
    if (selectedIds.length === 1) {
      const targetId = selectedIds[0];
      const target = shapes.find(s => s.id === targetId);
      if (target) {
        updateShape(target.id, {
          geometryType: 'image',
          elementKey: element.key,
          elementDataUrl: svgToDataUrl(element.svg),
          attributes: {
            ...target.attributes,
            elementKey: element.key,
            elementCategory: element.category,
            elementSubcategory: element.subcategory,
          },
        });
        setSaveStatus('unsaved');
      }
    }
  }, [selectedIds, shapes, updateShape]);

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
    // When placing an unplaced room or building, set tool to rectangle so user can draw room boundaries
    setTool('rectangle');
  };

  const handleRoomDrop = useCallback((roomData: { id: string; name: string; category: string; code?: string }, canvasX: number, canvasY: number) => {
    const rw = 140;
    const rh = 90;
    const newRoomShape: EditorShape = {
      id: uuidv4(),
      objectId: roomData.id,
      objectTypeId: 'room',
      geometryType: 'rectangle' as any,
      x: Math.round(canvasX - rw / 2),
      y: Math.round(canvasY - rh / 2),
      width: rw,
      height: rh,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      points: [],
      name: roomData.name,
      color: '#3b82f6',
      attributes: {
        category: roomData.category,
        code: roomData.code,
        isRoom: true,
      },
    };
    handleShapeFinalized(newRoomShape);
    setSelectedIds([newRoomShape.id]);
    setSelectedNode(null);
    setSelectedEdge(null);
    setIsSidebarOpen(true);
    setTool('select');
    setSaveStatus('unsaved');
  }, [handleShapeFinalized]);

  const handleRoomPlaceDirect = useCallback((roomData: { id: string; name: string; category: string; code?: string }) => {
    const cx = Math.round((-stageViewport.position.x + 600) / (stageViewport.scale || 1));
    const cy = Math.round((-stageViewport.position.y + 450) / (stageViewport.scale || 1));
    handleRoomDrop(roomData, Math.max(100, cx), Math.max(100, cy));
  }, [handleRoomDrop, stageViewport]);

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

      {/* â”€â”€ TOP TOOLBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              <option value="">Campus Map (Site Overview)</option>
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
              onChange={e => {
                handleSelectFloor(e.target.value);
                setActiveRoomId('');
              }}
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

          {/* Level 3: Room Interior Pill (if active) */}
          {activeRoomId && (
            <>
              <ChevronRight size={13} className="text-slate-300 shrink-0" />
              <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1">
                <DoorOpen size={13} className="text-indigo-700 shrink-0" />
                <span className="font-bold text-indigo-900 text-xs truncate max-w-[150px]">
                  {roomObject ? (typeof roomObject.name === 'string' ? roomObject.name : roomObject.name.en) : 'Room Interior'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveRoomId('')}
                  title="Return to Floor Map"
                  className="ml-1 text-indigo-500 hover:text-indigo-800 text-[10px] bg-indigo-100 hover:bg-indigo-200 px-1.5 py-0.5 rounded font-semibold transition-colors"
                >
                  ✕ Floor Map
                </button>
              </div>
            </>
          )}
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

          {/* Auto-Generate / Sync Navigation Graph */}
          <button
            onClick={handleGenerateGraph}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-all shadow-xs"
            title="Auto-generate or sync navigation graph from drawn corridors, doors, and rooms"
          >
            <Sparkles size={13} className="text-indigo-600" />
            <span>Sync Graph</span>
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

          {/* Keyboard Shortcuts Help */}
          <button
            title="Keyboard Shortcuts (?)"
            onClick={() => setShowShortcutHelp(true)}
            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all"
          >
            <HelpCircle size={15} />
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

      {/* â”€â”€ MAIN 3-PANE LAYOUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* LEFT: Tabbed Left Panel â€” Tools/Types or Elements */}
        <div className="flex flex-col h-full shrink-0" style={{ width: '256px' }}>
          {/* Tab switcher */}
          <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
            <button
              onClick={() => setLeftPanelTab('tools')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                leftPanelTab === 'tools'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid size={12} />
              Tools
            </button>
            <button
              onClick={() => { setLeftPanelTab('elements'); setTool('select'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                leftPanelTab === 'elements'
                  ? 'text-violet-600 border-b-2 border-violet-600 bg-white'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Sparkles size={12} />
              Elements
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            {leftPanelTab === 'tools' ? (
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
                canvasContainerRef={canvasContainerRef}
                stageScale={stageViewport.scale}
                stagePosition={stageViewport.position}
                onRoomDrop={handleRoomDrop}
                onRoomPlaceDirect={handleRoomPlaceDirect}
              />
            ) : (
              <ElementsPanel
                onElementDrop={handleElementDrop}
                onElementClick={handleElementClick}
                canvasContainerRef={canvasContainerRef}
                stageScale={stageViewport.scale}
                stagePosition={stageViewport.position}
                hasSelectedShape={selectedIds.length === 1}
              />
            )}
          </div>
        </div>

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

          {tool === 'polygon' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-blue-700 text-white text-xs font-medium px-4 py-1.5 rounded-full shadow-xl">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Click to place polygon vertices. Double-click, click start point, or press Enter to close. (Esc to cancel)</span>
            </div>
          )}

          {/* Preview overlay banner */}
          {showPreview && (
            <div className="absolute inset-0 z-20 pointer-events-none border-4 border-emerald-400">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                PREVIEW MODE â€” Interactive Inspection
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
            onRebuildGraph={handleGenerateGraph}
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
          <div ref={canvasContainerRef} className="flex-1 w-full h-full relative overflow-hidden">
            <CanvasStage
              shapes={shapes}
              setShapes={setShapes}
              onShapeFinalized={handleShapeFinalized}
              onShapeUpdated={updateShape}
              selectedIds={showPreview ? [] : selectedIds}
              setSelectedIds={showPreview ? () => {} : setSelectedIds}
              tool={showPreview ? 'select' : tool}
              onToolChange={setTool}
              gridSize={activeGridSize}
              isSnapping={isSnapping}
              onCoordinatesChange={setPointerCoords}
              activeType={activeType}
              calibration={calibration}
              onDraftMeasure={setDraftMeasure}

              // Graph Network — hide floor nodes when in room interior mode
              nodes={activeRoomId ? [] : floorNodes}
              connections={activeRoomId ? [] : campusConnections}
              layers={layers}
              activeCampusId={activeCampusId}
              activeBuildingId={activeBuildingId}
              activeFloorId={activeFloorId}
              onNodeCreated={(node) => {
                // When marking an entrance for a building, ensure it associates with that building's ground floor
                if ((node.type === 'entrance' || node.type === 'outdoor_waypoint') && node.buildingId) {
                  const bldGround = floors.find(f => f.buildingId === node.buildingId && (f.level === 0 || f.level === 1));
                  if (bldGround && !node.floorId) {
                    node.floorId = bldGround.id;
                  }
                }
                createNode(node);
                setSelectedNode(node);
                setSelectedIds([]);
                setIsSidebarOpen(true);
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
              onViewportChange={(scale, position) => setStageViewport({ scale, position })}
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

          {/* â”€â”€ BOTTOM STATUS BAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                  <Clock size={12} /> Savingâ€¦
                </span>
              )}
            </div>
            
            <button 
              onClick={() => setIsSidebarOpen(v => !v)}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 transition-colors"
              title="Toggle Properties Panel"
            >
              {isSidebarOpen ? 'Hide Panel' : 'Show Panel'}
            </button>
          </div>
        </div>

        {/* RIGHT: Properties Sidebar */}
        {isSidebarOpen && (
          <div className="flex flex-col h-full z-10 shrink-0">
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
              onClose={() => setIsSidebarOpen(false)}
            />
          </div>
        )}
      </div>

      {/* â”€â”€ DELETE CONFIRMATION MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
        nodes={activeBuildingId ? navStore.getNodesByBuilding(activeBuildingId) : floorNodes}
      />

      {/* Calibration Modal */}
      <MapCalibrationModal
        isOpen={showCalibration}
        onClose={() => setShowCalibration(false)}
        calibration={calibration}
        onChange={setCalibration}
      />

      {/* â”€â”€ KEYBOARD SHORTCUTS HELP MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showShortcutHelp && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full border border-slate-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Keyboard size={18} className="text-blue-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Keyboard Shortcuts & Editor Controls</h3>
              </div>
              <button
                onClick={() => setShowShortcutHelp(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Drawing Tools</span>
                <div className="space-y-1">
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Select Mode</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">V</kbd></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Pan Tool</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">H</kbd></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Draw Rectangle</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">R</kbd></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Draw Polygon</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">P</kbd></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Draw Circle</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">C</kbd></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Draw Line / Wall</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">L</kbd></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Place POI Point</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">M</kbd></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Add Nav Node</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">N</kbd></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Connect Path</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">E</kbd></div>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Actions & Navigation</span>
                <div className="space-y-1">
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Undo / Redo</span><span className="space-x-1"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">Ctrl+Z</kbd><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">Ctrl+Y</kbd></span></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Duplicate</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">Ctrl+D</kbd></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Save Floor</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">Ctrl+S</kbd></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Delete Item</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">Del</kbd></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Fit to View</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">F</kbd></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Zoom In / Out</span><span className="space-x-1"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">+</kbd><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">-</kbd></span></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Reset Zoom 100%</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">0</kbd></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Cancel / Deselect</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">Esc</kbd></div>
                  <div className="flex justify-between py-0.5"><span className="text-slate-600">Temporary Pan</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-[10px]">Space</kbd></div>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowShortcutHelp(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
