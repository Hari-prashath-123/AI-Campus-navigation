import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { campusService } from '../api/campus.service';
import { objectService } from '../api/object.service';
import { routingService, RouteResult, RouteStep } from '../api/routing.service';
import { navStore } from '../api/nav.store';
import { objectStore } from '../api/object.store';
import { Campus, Floor, Building, MapObject, SpatialNode, EditorShape } from '../types';
import { CampusConnection } from '../types/connection';
import { MapViewer } from '../components/MapViewer';
import {
  Navigation, User, Car, MapPin, Layers, Bot, ArrowUpDown,
  Search, X, Check, AlertCircle, CornerUpLeft, CornerUpRight,
  ArrowUp, Compass, ChevronRight, Building2,
  Clock, Footprints, ArrowLeft, LogOut, Crosshair, ChevronDown, Database,
} from 'lucide-react';
import { AIAssistantPage } from './AIAssistantPage';

// ─── View level type ──────────────────────────────────────────────────────────
type ViewLevel = 'campus' | 'building' | 'floor' | 'room';

interface PinLocation {
  x: number;
  y: number;
  level: ViewLevel;
  floorId?: string;
  roomId?: string;
}

interface ViewState {
  level: ViewLevel;
  campusId: string;
  buildingId?: string;
  floorId?: string;
  roomId?: string;
}

export const UserNavigationPage: React.FC = () => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string>('');
  
  const [floors, setFloors] = useState<Floor[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [objects, setObjects] = useState<MapObject[]>([]);
  const [nodes, setNodes] = useState<SpatialNode[]>([]);
  const [connections, setConnections] = useState<CampusConnection[]>([]);
  const [editorShapes, setEditorShapes] = useState<EditorShape[]>([]);

  // ─── Drill-down view state ──────────────────────────────────────────────────
  const [view, setView] = useState<ViewState>({ level: 'campus', campusId: '' });

  // ─── Stair/Elevator floor picker ───────────────────────────────────────────
  const [floorPickerOpen, setFloorPickerOpen] = useState(false);
  const [floorPickerContext, setFloorPickerContext] = useState<{ label: string; shape: EditorShape } | null>(null);

  // ─── Pick on Map state ─────────────────────────────────────────────────────
  const [pickMode, setPickMode] = useState<'start' | 'dest' | null>(null);
  // Dropdown scope tab: 'current' | 'all'
  const [dropdownScope, setDropdownScope] = useState<'current' | 'all'>('current');

  const [sourceQuery, setSourceQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [sourceObj, setSourceObj] = useState<MapObject | null>(null);
  const [destObj, setDestObj] = useState<MapObject | null>(null);
  const [isSearchingSource, setIsSearchingSource] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [mode, setMode] = useState<'walking' | 'vehicle'>('walking');
  const [accessible, setAccessible] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'nav' | 'ai'>('nav');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(true);

  const [sourcePinPos, setSourcePinPos] = useState<PinLocation | null>(null);
  const [destPinPos, setDestPinPos] = useState<PinLocation | null>(null);

  // ─── Lookups ────────────────────────────────────────────────────────────────
  const buildingMap = useMemo(() => new Map(buildings.map(b => [b.id, b])), [buildings]);
  const floorMap = useMemo(() => new Map(floors.map(f => [f.id, f])), [floors]);

  // Floor-plan coordinates cannot be drawn directly on the campus plan.  Resolve
  // indoor locations to their own building shape, using stable IDs first.  In
  // particular, avoid substring matching here: names such as "Machine Lab" and
  // "Mechanical Lab" must never share a campus pin.
  const getCampusBuildingAnchor = (obj: MapObject | null): { x: number; y: number } | undefined => {
    if (!obj) return undefined;
    const buildingId = obj.buildingId || (obj.floorId ? floorMap.get(obj.floorId)?.buildingId : undefined);
    if (!buildingId) return undefined;

    // The declared outdoor entrance is the authoritative campus anchor. It
    // keeps the campus overlay on the walkable network instead of projecting
    // a floor-plan coordinate onto an arbitrary building edge.
    const outdoorEntrance = nodes.find(node =>
      node.buildingId === buildingId &&
      !node.floorId &&
      (node.type === 'entrance' || node.type === 'outdoor_waypoint') &&
      node.coordinates
    );
    if (outdoorEntrance) return outdoorEntrance.coordinates;

    const building = buildingMap.get(buildingId);
    const buildingName = (building ? (typeof building.name === 'string' ? building.name : building.name?.en || '') : '').trim().toLowerCase();
    const buildingShape = editorShapes.find(shape =>
      shape.objectId === buildingId ||
      shape.id === buildingId ||
      shape.attributes?.buildingId === buildingId ||
      // Names are only a legacy fallback when they match exactly.
      Boolean(buildingName && shape.name?.trim().toLowerCase() === buildingName)
    );

    if (!buildingShape) return undefined;
    return {
      x: Math.round(buildingShape.x + (buildingShape.width || 120) / 2),
      y: Math.round(buildingShape.y + (buildingShape.height || 100)),
    };
  };

  // ─── Visible pins matching the current active view ─────────────────────────
  const visibleSourcePin = useMemo(() => {
    if (!sourcePinPos && !sourceObj) return undefined;
    if (view.level === 'campus' || view.level === 'building') {
      // A building is represented on the campus map by its entrance anchor,
      // never by the floor-plan/object centre stored when it was selected.
      if (sourceObj?.category === 'building') return getCampusBuildingAnchor(sourceObj);
      if (sourcePinPos?.level === 'campus') return { x: sourcePinPos.x, y: sourcePinPos.y };
      if (sourceObj && !sourceObj.floorId && sourceObj.coordinates && (sourceObj.coordinates.x > 0 || sourceObj.coordinates.y > 0)) {
        return sourceObj.coordinates;
      }
      return getCampusBuildingAnchor(sourceObj);
    }
    if (view.level === 'floor') {
      if (sourcePinPos?.level === 'floor' && view.floorId === sourcePinPos.floorId) return { x: sourcePinPos.x, y: sourcePinPos.y };
      if (sourceObj && sourceObj.floorId === view.floorId && sourceObj.coordinates) return sourceObj.coordinates;
      return undefined;
    }
    if (view.level === 'room') {
      if (sourcePinPos?.level === 'room' && view.roomId === sourcePinPos.roomId) return { x: sourcePinPos.x, y: sourcePinPos.y };
      return undefined;
    }
    return undefined;
  }, [sourcePinPos, sourceObj, view, editorShapes, floorMap, buildingMap, nodes]);

  const visibleDestPin = useMemo(() => {
    if (!destPinPos && !destObj) return undefined;
    if (view.level === 'campus' || view.level === 'building') {
      if (destObj?.category === 'building') return getCampusBuildingAnchor(destObj);
      if (destPinPos?.level === 'campus') return { x: destPinPos.x, y: destPinPos.y };
      if (destObj && !destObj.floorId && destObj.coordinates && (destObj.coordinates.x > 0 || destObj.coordinates.y > 0)) {
        return destObj.coordinates;
      }
      return getCampusBuildingAnchor(destObj);
    }
    if (view.level === 'floor') {
      if (destPinPos?.level === 'floor' && view.floorId === destPinPos.floorId) return { x: destPinPos.x, y: destPinPos.y };
      if (destObj && destObj.floorId === view.floorId && destObj.coordinates) return destObj.coordinates;
      return undefined;
    }
    if (view.level === 'room') {
      if (destPinPos?.level === 'room' && view.roomId === destPinPos.roomId) return { x: destPinPos.x, y: destPinPos.y };
      return undefined;
    }
    return undefined;
  }, [destPinPos, destObj, view, editorShapes, floorMap, buildingMap, nodes]);

  // ─── Derive currentFloorId from view ───────────────────────────────────────
  const currentFloorId = view.floorId || '';

  // Campus entrance nodes keep campus coordinates in storage, but the floor
  // editor shows them projected onto the relevant outer edge. Reuse that
  // projection for the user-facing route so the line enters the floor at the
  // exact Main/Side Entrance the editor displays.
  const floorEntrancePositions = useMemo<Record<string, { x: number; y: number }>>(() => {
    if (view.level !== 'floor' || !view.buildingId) return {};

    let campusShapes: EditorShape[] = [];
    for (const key of [`editor-shapes-${view.campusId}`, `editor-shapes-${view.campusId}--`]) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(parsed) && parsed.length) { campusShapes = parsed; break; }
      } catch {}
    }
    const building = buildingMap.get(view.buildingId);
    const name = building ? (typeof building.name === 'string' ? building.name : building.name?.en || '').trim().toLowerCase() : '';
    const shape = campusShapes.find(item =>
      item.objectId === view.buildingId ||
      item.id === view.buildingId ||
      item.attributes?.buildingId === view.buildingId ||
      Boolean(name && item.name?.trim().toLowerCase() === name)
    );
    if (!shape) return {};

    const bx = shape.x;
    const by = shape.y;
    const bw = shape.width || 120;
    const bh = shape.height || 100;
    const positions: Record<string, { x: number; y: number }> = {};

    nodes.filter(node =>
      node.buildingId === view.buildingId &&
      !node.floorId &&
      (node.type === 'entrance' || node.type === 'outdoor_waypoint')
    ).forEach(node => {
      const { x, y } = node.coordinates;
      const distances = [Math.abs(y - by), Math.abs(y - (by + bh)), Math.abs(x - bx), Math.abs(x - (bx + bw))];
      const edge = distances.indexOf(Math.min(...distances));
      const relX = Math.max(0.12, Math.min(0.88, (x - bx) / bw));
      const relY = Math.max(0.12, Math.min(0.88, (y - by) / bh));
      positions[node.id] = edge === 0 ? { x: Math.round(relX * 1200), y: 6 }
        : edge === 1 ? { x: Math.round(relX * 1200), y: 954 }
        : edge === 2 ? { x: 6, y: Math.round(relY * 960) }
        : { x: 1194, y: Math.round(relY * 960) };
    });
    return positions;
  }, [view, nodes, buildingMap]);

  // ─── Load 2D map shapes for current view ───────────────────────────────────
  useEffect(() => {
    if (!view.campusId) return;

    let shapes: EditorShape[] = [];

    if (view.level === 'room' && view.roomId && view.floorId && view.buildingId) {
      // Room interior: check direct room storage key
      const roomKey = `editor-shapes-${view.campusId}-${view.buildingId}-${view.floorId}-${view.roomId}`;
      const raw = localStorage.getItem(roomKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) shapes = parsed;
        } catch (e) {}
      }

      // Check alternate keys ending with roomId
      if (shapes.length === 0) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('editor-shapes-') && k.endsWith(`-${view.roomId}`)) {
            try {
              const parsed = JSON.parse(localStorage.getItem(k) || '[]');
              if (Array.isArray(parsed) && parsed.length > 0) { shapes = parsed; break; }
            } catch (e) {}
          }
        }
      }

      // Fallback: synthesize boundary from floor shapes so the room layout always renders correctly
      if (shapes.length === 0) {
        let floorShapes: EditorShape[] = [];
        const floorKey = `editor-shapes-${view.campusId}-${view.buildingId}-${view.floorId}`;
        const rawFloor = localStorage.getItem(floorKey);
        if (rawFloor) {
          try { floorShapes = JSON.parse(rawFloor); } catch (e) {}
        }
        if (floorShapes.length === 0) {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('editor-shapes-') && k.includes(view.floorId) && !k.endsWith(view.roomId)) {
              try {
                const arr = JSON.parse(localStorage.getItem(k) || '[]');
                if (Array.isArray(arr) && arr.length > 0) { floorShapes = arr; break; }
              } catch (e) {}
            }
          }
        }

        const roomObj = objectStore.getById(view.roomId);
        const rName = (roomObj ? (typeof roomObj.name === 'string' ? roomObj.name : roomObj.name?.en) : '') || '';
        const rCode = roomObj?.code || '';

        const floorRoomShape = floorShapes.find(s => {
          if (s.objectId === view.roomId || s.id === view.roomId || s.id === `shape_${view.roomId}`) return true;
          const sName = (s.name || '').toLowerCase().trim();
          if (rName && sName === rName.toLowerCase().trim()) return true;
          if (rCode && sName === rCode.toLowerCase().trim()) return true;
          if (rName && (sName.includes(rName.toLowerCase().trim()) || rName.toLowerCase().trim().includes(sName))) return true;
          return false;
        });

        const fw = floorRoomShape?.width || 240;
        const fh = floorRoomShape?.height || 160;
        let canvasW = 1200;
        let canvasH = 960;
        if (fw <= fh) {
          canvasH = 1000;
          canvasW = Math.max(240, Math.round(1000 * (fw / fh)));
        } else {
          canvasW = 1200;
          canvasH = Math.max(240, Math.round(1200 * (fh / fw)));
        }

        shapes = [
          {
            id: `room_boundary_${view.roomId}`,
            objectTypeId: 'room_boundary',
            geometryType: 'rectangle' as any,
            x: 0,
            y: 0,
            width: canvasW,
            height: canvasH,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            points: [],
            name: `${rName || 'Room'} Layout`,
            color: '#3b82f6',
            isLocked: true,
            attributes: { isRoomPerimeter: true },
          },
          {
            id: `room_door_${view.roomId}`,
            objectTypeId: 'entrance',
            geometryType: 'point',
            x: Math.round(canvasW / 2),
            y: canvasH,
            width: 24,
            height: 24,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            points: [],
            name: `${rName || 'Room'} Entrance Door`,
            color: '#10b981',
            attributes: { isDoor: true, isEntrance: true },
          }
        ];
      }
    } else if (view.level === 'floor' && view.floorId && view.buildingId) {
      // Floor map: search for floor-specific storage key
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`editor-shapes-${view.campusId}`) && k.endsWith(`-${view.floorId}`)) {
          try { shapes = JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) {}
          break;
        }
      }
    } else {
      // Campus map: load campus-level shapes
      for (const ck of [`editor-shapes-${view.campusId}`, `editor-shapes-${view.campusId}--`]) {
        const raw = localStorage.getItem(ck);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) { shapes = parsed; break; }
          } catch (e) {}
        }
      }
    }

    setEditorShapes(shapes);
  }, [view]);

  // ─── Load available campuses ────────────────────────────────────────────────
  useEffect(() => {
    campusService.getCampuses().then(res => {
      if (res.success && res.data.length > 0) {
        setCampuses(res.data);
        const firstId = res.data[0].id;
        setSelectedCampus(firstId);
        setView({ level: 'campus', campusId: firstId });
      }
    });
  }, []);

  // ─── Load campus spatial database ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedCampus) return;
    Promise.all([
      campusService.getFloorsByCampus(selectedCampus),
      campusService.getBuildingsByCampus(selectedCampus),
      objectService.getObjectsByCampus(selectedCampus),
    ]).then(([floorsRes, bldRes, objsRes]) => {
      if (floorsRes.success) setFloors(floorsRes.data);
      if (bldRes.success) setBuildings(bldRes.data);
      if (objsRes.success) setObjects(objsRes.data);
      setNodes(navStore.getNodesByCampus(selectedCampus));
      setConnections(navStore.getConnectionsByCampus(selectedCampus));
    });
    setSourceObj(null); setDestObj(null);
    setSourceQuery(''); setDestQuery('');
    setRoute(null); setError('');
    setView({ level: 'campus', campusId: selectedCampus });
  }, [selectedCampus]);


  // ─── Drill-down navigation handlers ────────────────────────────────────────
  const enterBuilding = useCallback((buildingId: string) => {
    // Find ground floor (level 0 or lowest level)
    let bldFloors = floors.filter(f => f.buildingId === buildingId).sort((a, b) => a.level - b.level);
    if (bldFloors.length === 0) {
      // Try matching by building name
      const bldObj = buildings.find(b => b.id === buildingId || (typeof b.name === 'string' ? b.name : b.name?.en) === buildingId);
      if (bldObj) {
        bldFloors = floors.filter(f => f.buildingId === bldObj.id).sort((a, b) => a.level - b.level);
      }
    }
    const groundFloor = bldFloors[0] || floors[0];
    if (!groundFloor) return;
    setView({
      level: 'floor',
      campusId: selectedCampus,
      buildingId: groundFloor.buildingId || buildingId,
      floorId: groundFloor.id
    });
  }, [floors, buildings, selectedCampus]);

  const enterFloor = useCallback((floorId: string, buildingId: string) => {
    setView({ level: 'floor', campusId: selectedCampus, buildingId, floorId });
  }, [selectedCampus]);

  const enterRoom = useCallback((roomObj: MapObject) => {
    if (!roomObj.floorId || !roomObj.buildingId) return;
    setView({
      level: 'room',
      campusId: selectedCampus,
      buildingId: roomObj.buildingId,
      floorId: roomObj.floorId,
      roomId: roomObj.id,
    });
  }, [selectedCampus]);

  const goBack = useCallback(() => {
    setFloorPickerOpen(false);
    if (view.level === 'room') {
      setView({ level: 'floor', campusId: view.campusId, buildingId: view.buildingId, floorId: view.floorId });
    } else if (view.level === 'floor') {
      setView({ level: 'building', campusId: view.campusId, buildingId: view.buildingId });
    } else if (view.level === 'building') {
      setView({ level: 'campus', campusId: view.campusId });
    }
  }, [view]);

  const exitToOutdoor = useCallback(() => {
    setFloorPickerOpen(false);
    setView({ level: 'campus', campusId: view.campusId });
  }, [view]);

  // ─── Shape click handler (for drill-down on map click) ─────────────────────
  const handleShapeClick = useCallback((shape: EditorShape) => {
    const shapeName = (shape.name || '').toLowerCase().trim();

    // 1. Stair / Elevator shapes → show floor picker
    const isStairOrElev =
      shape.attributes?.isStairs ||
      shape.attributes?.isElevator ||
      shape.objectTypeId === 'staircase' ||
      shape.objectTypeId === 'elevator' ||
      shapeName.includes('stair') ||
      shapeName.includes('elevator') ||
      shapeName.includes('lift');

    if (isStairOrElev && (view.level === 'floor' || view.level === 'room') && view.buildingId) {
      setFloorPickerContext({ label: shape.name || 'Stairs / Elevator', shape });
      setFloorPickerOpen(true);
      return;
    }

    // 2. Building click on Campus Map → enter building ground floor
    if (view.level === 'campus' || view.level === 'building') {
      let bldId = shape.attributes?.buildingId || shape.objectId;
      if (!bldId) {
        const matched = buildings.find(b => {
          const bName = (typeof b.name === 'string' ? b.name : b.name?.en || '').toLowerCase().trim();
          return b.id === shape.id || (bName && (shapeName.includes(bName) || bName.includes(shapeName)));
        });
        if (matched) bldId = matched.id;
      }
      // If not matched yet, check if shape is a building element
      if (!bldId && (shape.objectTypeId === 'building' || shapeName.includes('block') || shapeName.includes('building') || shapeName.includes('hall') || shapeName.includes('arena') || shapeName.includes('auditorium') || shapeName.includes('lab') || shapeName.includes('office'))) {
        // Match with best candidate in buildings
        const cand = buildings.find(b => {
          const words = (typeof b.name === 'string' ? b.name : b.name?.en || '').toLowerCase().split(/\s+/);
          return words.some(w => w.length > 3 && shapeName.includes(w));
        }) || buildings[0];
        if (cand) bldId = cand.id;
      }

      if (bldId) {
        enterBuilding(bldId);
        return;
      }
    }

    // 3. Room click on Floor Map → enter room interior mode
    if (view.level === 'floor') {
      let rId = shape.objectId;
      if (!rId && shape.id.startsWith('shape_')) {
        rId = shape.id.replace('shape_', '');
      }
      let foundObj = rId ? (objectStore.getById(rId) || objects.find(o => o.id === rId)) : null;

      if (!foundObj) {
        // Try matching room name to objects on this floor
        foundObj = objects.find(o => {
          if (o.floorId !== view.floorId) return false;
          const oName = (typeof o.name === 'string' ? o.name : o.name?.en || '').toLowerCase().trim();
          return oName && (shapeName === oName || shapeName.includes(oName) || oName.includes(shapeName));
        }) || null;
      }

      if (foundObj && foundObj.buildingId && foundObj.floorId) {
        enterRoom(foundObj);
        return;
      }

      // If room shape without backend object, still drill down using shape ID
      if ((shape.geometryType as any) === 'rectangle' || shape.attributes?.isRoom || shape.objectTypeId === 'room' || shapeName.includes('room') || shapeName.includes('lab') || shapeName.includes('cabin') || shapeName.includes('office')) {
        if (view.buildingId && view.floorId) {
          setView({
            level: 'room',
            campusId: selectedCampus,
            buildingId: view.buildingId,
            floorId: view.floorId,
            roomId: shape.id,
          });
        }
      }
    }
  }, [view, buildings, objects, selectedCampus, enterBuilding, enterRoom]);



  // ─── Available floors for stair/elevator picker ────────────────────────────
  const pickerFloors = useMemo(() => {
    if (!view.buildingId) return [];
    return floors.filter(f => f.buildingId === view.buildingId && f.id !== view.floorId)
      .sort((a, b) => a.level - b.level);
  }, [view, floors]);

  // ─── Breadcrumb trail ───────────────────────────────────────────────────────
  const breadcrumb = useMemo(() => {
    const crumbs: { label: string; action?: () => void }[] = [];
    const campus = campuses.find(c => c.id === selectedCampus);
    if (campus) crumbs.push({ label: typeof campus.name === 'string' ? campus.name : campus.name.en, action: exitToOutdoor });
    if (view.buildingId) {
      const bld = buildingMap.get(view.buildingId);
      crumbs.push({ label: bld?.name.en || 'Building', action: () => enterBuilding(view.buildingId!) });
    }
    if (view.floorId) {
      const flr = floorMap.get(view.floorId);
      crumbs.push({ label: flr ? `L${flr.level} – ${flr.name.en}` : 'Floor', action: view.level === 'room' ? () => setView({ level: 'floor', campusId: view.campusId, buildingId: view.buildingId, floorId: view.floorId }) : undefined });
    }
    if (view.roomId) {
      const roomObj = objectStore.getById(view.roomId);
      crumbs.push({ label: roomObj ? (typeof roomObj.name === 'string' ? roomObj.name : roomObj.name.en) : 'Room' });
    }
    return crumbs;
  }, [campuses, selectedCampus, view, buildingMap, floorMap, exitToOutdoor]);

  // ─── Clean Navigable Destinations Filter ────────────────────────────────────
  // Filter out noise elements like raw navigation paths, wall lines, corridors, compound walls
  const cleanDestinations = useMemo(() => {
    return objects.filter(o => {
      const name = (typeof o.name === 'string' ? o.name : o.name?.en || '').toLowerCase().trim();
      if (!name) return false;
      if (
        name.includes('navigation path') || name.includes('nav path') ||
        name.includes('compound wall') || name.includes('wall line') ||
        name.includes('vertical wall') || name.includes('horizontal wall') ||
        name.includes('corridor') || name.includes('asphalt') ||
        name.includes('boundary') || name.includes('perimeter')
      ) {
        return false;
      }
      return true;
    });
  }, [objects]);

  // Context-filtered items based on current map view level
  const contextDestinations = useMemo(() => {
    if (dropdownScope === 'all') {
      return cleanDestinations;
    }
    if (view.level === 'campus' || view.level === 'building') {
      // In Campus view: Show buildings, parking, main gates, outdoor landmarks
      const campusObjs = cleanDestinations.filter(o => !o.floorId || o.category === 'entrance' || o.category === 'landmark');
      // Also synthesize building destinations from buildings list if not in objects
      const now = new Date().toISOString();
      const bldDestinations: MapObject[] = buildings.map(b => ({
        id: b.id,
        campusId: selectedCampus,
        name: b.name,
        code: b.code,
        category: 'building' as any,
        coordinates: getCampusBuildingAnchor({ buildingId: b.id } as MapObject) || { x: 400, y: 400 },
        buildingId: b.id,
        floorId: '',
        objectTypeId: 'building',
        associatedNodeId: '',
        isAccessible: true,
        createdAt: now,
        updatedAt: now,
      }));
      // Merge unique by name/id
      const set = new Set(campusObjs.map(o => (typeof o.name === 'string' ? o.name : o.name?.en || '').toLowerCase()));
      const merged = [...campusObjs];
      for (const b of bldDestinations) {
        const bName = (typeof b.name === 'string' ? b.name : b.name?.en || '').toLowerCase();
        if (!set.has(bName)) {
          merged.push(b);
          set.add(bName);
        }
      }
      return merged;
    } else if (view.level === 'floor' || view.level === 'room') {
      // In Floor or Room view: Show rooms, labs, cabins on this floor
      return cleanDestinations.filter(o => o.floorId === view.floorId);
    }
    return cleanDestinations;
  }, [cleanDestinations, dropdownScope, view, buildings, editorShapes]);

  const sourceMatches = useMemo(() => {
    const list = contextDestinations;
    if (!sourceQuery.trim()) return list.slice(0, 15);
    const q = sourceQuery.toLowerCase().trim();
    return list.filter(o => {
      const name = (typeof o.name === 'string' ? o.name : o.name?.en || '').toLowerCase();
      return name.includes(q) || (o.code || '').toLowerCase().includes(q) || o.category.includes(q);
    }).slice(0, 15);
  }, [contextDestinations, sourceQuery]);

  const destMatches = useMemo(() => {
    const list = contextDestinations;
    if (!destQuery.trim()) return list.slice(0, 15);
    const q = destQuery.toLowerCase().trim();
    return list.filter(o => {
      const name = (typeof o.name === 'string' ? o.name : o.name?.en || '').toLowerCase();
      return name.includes(q) || (o.code || '').toLowerCase().includes(q) || o.category.includes(q);
    }).slice(0, 15);
  }, [contextDestinations, destQuery]);

  // ─── Route calculation ──────────────────────────────────────────────────────
  const calculateRoute = useCallback(async (
    start: MapObject | null, end: MapObject | null,
    travelMode: 'walking' | 'vehicle', accessibleOnly: boolean
  ) => {
    if (!start || !end) { setRoute(null); setError(''); return; }
    if (start.id === end.id) { setError('Start and destination cannot be the same.'); setRoute(null); return; }
    setIsCalculating(true); setError('');
    try {
      const res = await routingService.calculateRoute(selectedCampus, start.id, end.id, {
        accessibleOnly, mode: travelMode, blockedConnectionIds: [], allowRestricted: false,
      });
      if (res.success && res.data?.success) {
        setRoute(res.data);
        setNodes(navStore.getNodesByCampus(selectedCampus));
        setConnections(navStore.getConnectionsByCampus(selectedCampus));
        if (start.floorId) {
          const flr = floorMap.get(start.floorId);
          if (flr) enterFloor(start.floorId, start.buildingId || '');
        }
      } else {
        setError(res.data?.message || 'No traversable path found.');
        setRoute(null);
      }
    } catch (err: any) {
      setError(err.message || 'Routing error.');
      setRoute(null);
    } finally { setIsCalculating(false); }
  }, [selectedCampus, floorMap, enterFloor]);

  useEffect(() => {
    if (sourceObj && destObj) calculateRoute(sourceObj, destObj, mode, accessible);
  }, [sourceObj, destObj, mode, accessible, calculateRoute]);

  const selectSource = (obj: MapObject) => {
    // Keep the persisted entrance association when a campus building is picked
    // from the synthetic building list. Creating a second object with the same
    // ID used to discard that association and break routing.
    const stored = objectStore.getById(obj.id);
    const selected = {
      ...stored,
      ...obj,
      associatedNodeId: obj.associatedNodeId || stored?.associatedNodeId || '',
      entranceNodeIds: obj.entranceNodeIds?.length ? obj.entranceNodeIds : (stored?.entranceNodeIds || []),
    } as MapObject;
    if (stored) objectStore.update(selected.id, selected);
    else objectStore.create(selected);
    setObjects(prev => [...prev.filter(o => o.id !== selected.id), selected]);
    // Set pin position if coordinates are valid canvas coords
    if (selected.coordinates && (selected.coordinates.x > 0 || selected.coordinates.y > 0)) {
      const pinLevel = selected.floorId ? 'floor' : 'campus';
      setSourcePinPos({ x: selected.coordinates.x, y: selected.coordinates.y, level: pinLevel as any, floorId: selected.floorId || undefined });
    }
    setSourceObj(selected);
    setSourceQuery(typeof selected.name === 'string' ? selected.name : selected.name?.en || selected.code);
    setIsSearchingSource(false);
    setPickMode(null);
  };
  const selectDest = (obj: MapObject) => {
    const stored = objectStore.getById(obj.id);
    const selected = {
      ...stored,
      ...obj,
      associatedNodeId: obj.associatedNodeId || stored?.associatedNodeId || '',
      entranceNodeIds: obj.entranceNodeIds?.length ? obj.entranceNodeIds : (stored?.entranceNodeIds || []),
    } as MapObject;
    if (stored) objectStore.update(selected.id, selected);
    else objectStore.create(selected);
    setObjects(prev => [...prev.filter(o => o.id !== selected.id), selected]);
    // Set pin position if coordinates are valid canvas coords
    if (selected.coordinates && (selected.coordinates.x > 0 || selected.coordinates.y > 0)) {
      const pinLevel = selected.floorId ? 'floor' : 'campus';
      setDestPinPos({ x: selected.coordinates.x, y: selected.coordinates.y, level: pinLevel as any, floorId: selected.floorId || undefined });
    }
    setDestObj(selected);
    setDestQuery(typeof selected.name === 'string' ? selected.name : selected.name?.en || selected.code);
    setIsSearchingDest(false);
    setPickMode(null);
  };

  // Handler when user picks a point or shape on the map
  const handleCanvasPick = useCallback((coords: { x: number; y: number }, clickedShape?: EditorShape, clickedObj?: MapObject) => {
    if (!pickMode) return;

    let targetObj: MapObject | null = clickedObj || null;

    if (!targetObj && clickedShape) {
      // Only match named objects if the shape is NOT a polyline road/path (to avoid matching outdoor "Navigation Path" objects)
      const isPolylineShape = clickedShape.geometryType === 'polyline';
      const shapeName = (clickedShape.name || '').toLowerCase().trim();

      if (!isPolylineShape) {
        // Match objects strictly within the same floor/level context
        targetObj = objects.find(o => {
          // Level filter: campus view → outdoor objects only; floor view → same floor only
          if (view.level === 'campus' || view.level === 'building') {
            if (o.floorId && o.floorId !== '') return false;
          } else if (view.level === 'floor' || view.level === 'room') {
            if (!view.floorId || o.floorId !== view.floorId) return false;
          }
          return (
            o.id === clickedShape.objectId ||
            o.id === clickedShape.id ||
            (o.name && (typeof o.name === 'string' ? o.name : o.name.en).toLowerCase() === shapeName)
          );
        }) || null;
      }

      if (!targetObj) {
        // If clicked on building on campus map
        if (view.level === 'campus' || view.level === 'building') {
          const matchedBld = buildings.find(b => {
            const bName = (typeof b.name === 'string' ? b.name : b.name?.en || '').toLowerCase();
            return b.id === clickedShape.objectId || (shapeName && shapeName.includes(bName));
          });

          if (matchedBld) {
            const now = new Date().toISOString();
            targetObj = {
              id: matchedBld.id,
              campusId: selectedCampus,
              name: matchedBld.name,
              code: matchedBld.code,
              category: 'building' as any,
              coordinates: coords,
              buildingId: matchedBld.id,
              floorId: '',
              objectTypeId: 'building',
              associatedNodeId: '',
              isAccessible: true,
              createdAt: now,
              updatedAt: now,
            };
          }
        } else {
          // Room / POI shape on floor map - create a location point
          const now = new Date().toISOString();
          targetObj = {
            id: clickedShape.objectId || clickedShape.id,
            campusId: selectedCampus,
            name: { en: clickedShape.name || 'Selected Location' },
            code: 'MAP-LOC',
            category: 'room' as any,
            coordinates: coords,
            buildingId: view.buildingId || '',
            floorId: view.floorId || '',
            objectTypeId: 'room',
            associatedNodeId: '',
            isAccessible: true,
            createdAt: now,
            updatedAt: now,
          };
        }
      }
    }

    if (!targetObj) {
      // Free point on canvas
      const now = new Date().toISOString();
      targetObj = {
        id: `loc_${coords.x}_${coords.y}`,
        campusId: selectedCampus,
        name: { en: `Location (${coords.x}, ${coords.y})` },
        code: 'PIN',
        category: 'landmark' as any,
        coordinates: coords,
        buildingId: view.buildingId || '',
        floorId: view.floorId || '',
        objectTypeId: 'point',
        associatedNodeId: '',
        isAccessible: true,
        createdAt: now,
        updatedAt: now,
      };
    }

    if (targetObj) {
      // Ensure coordinates match user click exactly
      targetObj = { ...targetObj, coordinates: coords };
      // Find nearest spatial node on this floor/campus to guarantee valid routing
      if (!targetObj.associatedNodeId) {
        const sameFloorNodes = nodes.filter(n => (!targetObj?.floorId || n.floorId === targetObj?.floorId));
        const cands = sameFloorNodes.length > 0 ? sameFloorNodes : nodes;
        let closestNode = cands[0];
        let minDist = Infinity;
        for (const n of cands) {
          if (!n.coordinates) continue;
          const d = Math.hypot(n.coordinates.x - coords.x, n.coordinates.y - coords.y);
          if (d < minDist) {
            minDist = d;
            closestNode = n;
          }
        }
        if (closestNode) {
          targetObj.associatedNodeId = closestNode.id;
        }
      }

      // Upsert into objectStore so routing engine and search recognize it
      objectStore.create(targetObj);
      setObjects(prev => [...prev.filter(o => o.id !== targetObj?.id), targetObj!]);

      if (pickMode === 'start') {
        setSourcePinPos({ x: coords.x, y: coords.y, level: view.level, floorId: view.floorId, roomId: view.roomId });
        selectSource(targetObj);
      } else {
        setDestPinPos({ x: coords.x, y: coords.y, level: view.level, floorId: view.floorId, roomId: view.roomId });
        selectDest(targetObj);
      }
    }
  }, [pickMode, objects, buildings, view]);
  const handlePinDrag = (which: 'source' | 'dest', newCanvasCoords: { x: number; y: number }) => {
    if (which === 'source') {
      setSourcePinPos(prev => prev ? { ...prev, x: newCanvasCoords.x, y: newCanvasCoords.y } : { x: newCanvasCoords.x, y: newCanvasCoords.y, level: view.level, floorId: view.floorId, roomId: view.roomId });
      if (sourceObj) {
        const updated = { ...sourceObj, coordinates: newCanvasCoords };
        // Find nearest node
        const cands = nodes.filter(n => !sourceObj.floorId || n.floorId === sourceObj.floorId);
        const pool = cands.length > 0 ? cands : nodes;
        let closest = pool[0];
        let minD = Infinity;
        for (const n of pool) {
          if (!n.coordinates) continue;
          const d = Math.hypot(n.coordinates.x - newCanvasCoords.x, n.coordinates.y - newCanvasCoords.y);
          if (d < minD) { minD = d; closest = n; }
        }
        if (closest) updated.associatedNodeId = closest.id;
        setSourceObj(updated);
        objectStore.create(updated);
        setObjects(prev => [...prev.filter(o => o.id !== updated.id), updated]);
      }
    } else {
      setDestPinPos(prev => prev ? { ...prev, x: newCanvasCoords.x, y: newCanvasCoords.y } : { x: newCanvasCoords.x, y: newCanvasCoords.y, level: view.level, floorId: view.floorId, roomId: view.roomId });
      if (destObj) {
        const updated = { ...destObj, coordinates: newCanvasCoords };
        const cands = nodes.filter(n => !destObj.floorId || n.floorId === destObj.floorId);
        const pool = cands.length > 0 ? cands : nodes;
        let closest = pool[0];
        let minD = Infinity;
        for (const n of pool) {
          if (!n.coordinates) continue;
          const d = Math.hypot(n.coordinates.x - newCanvasCoords.x, n.coordinates.y - newCanvasCoords.y);
          if (d < minD) { minD = d; closest = n; }
        }
        if (closest) updated.associatedNodeId = closest.id;
        setDestObj(updated);
        objectStore.create(updated);
        setObjects(prev => [...prev.filter(o => o.id !== updated.id), updated]);
      }
    }
  };
    const clearSource = () => { setSourceObj(null); setSourceQuery(''); setSourcePinPos(null); setRoute(null); setError(''); };
  const clearDest = () => { setDestObj(null); setDestQuery(''); setDestPinPos(null); setRoute(null); setError(''); };
  const swapEndpoints = () => {
    const [ps, psq] = [sourceObj, sourceQuery];
    setSourceObj(destObj); setSourceQuery(destQuery);
    setDestObj(ps); setDestQuery(psq);
  };

  const routeFloors = useMemo(() => {
    if (!route?.floors?.length) return [];
    return route.floors.map(id => floorMap.get(id)).filter(Boolean) as Floor[];
  }, [route, floorMap]);

  const renderTurnIcon = (turnType: RouteStep['turnType']) => {
    switch (turnType) {
      case 'left': case 'slight_left': return <CornerUpLeft size={16} className="text-blue-600" />;
      case 'right': case 'slight_right': return <CornerUpRight size={16} className="text-blue-600" />;
      case 'elevator': return <Layers size={16} className="text-purple-600" />;
      case 'stairs': return <Layers size={16} className="text-amber-600" />;
      case 'depart': return <MapPin size={16} className="text-emerald-600" />;
      case 'arrive': return <Check size={16} className="text-red-600" />;
      default: return <ArrowUp size={16} className="text-blue-600" />;
    }
  };



  return (
    <div className="flex h-screen bg-slate-50 w-full overflow-hidden relative">
      {/* Sidebar */}
      <div className={`
        ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        w-full md:w-[420px] shrink-0 bg-white border-r border-slate-200 flex flex-col z-20 shadow-md transition-transform duration-200 absolute md:relative h-full
      `}>
        {/* Nav / AI Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            className={`flex-1 py-3.5 font-semibold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'nav' ? 'text-blue-600 border-blue-600 bg-blue-50/20' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
            onClick={() => setActiveTab('nav')}
          >
            <Navigation size={17} /> Navigation
          </button>
          <button
            className={`flex-1 py-3.5 font-semibold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'ai' ? 'text-indigo-600 border-indigo-600 bg-indigo-50/20' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
            onClick={() => setActiveTab('ai')}
          >
            <Bot size={17} /> AI Assistant
          </button>
        </div>

        {activeTab === 'nav' ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Campus Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Building2 size={12} /> Campus Site
              </label>
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>
                    {typeof c.name === 'string' ? c.name : c.name.en} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Building Floor Selector (when inside a building) */}
            {(view.level === 'floor' || view.level === 'room') && view.buildingId && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider flex items-center gap-1">
                  <Layers size={12} /> Floors
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {floors.filter(f => f.buildingId === view.buildingId).sort((a, b) => a.level - b.level).map(f => (
                    <button
                      key={f.id}
                      onClick={() => enterFloor(f.id, view.buildingId!)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentFloorId === f.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100'}`}
                    >
                      L{f.level} – {typeof f.name === 'string' ? f.name : f.name.en}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 relative shadow-sm">
              <button onClick={swapEndpoints} title="Swap" className="absolute right-3 top-[52px] w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors z-10">
                <ArrowUpDown size={14} />
              </button>

              {/* Start */}
              <div className="relative">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 pr-2">
                    <div className="w-8 flex items-center justify-center text-emerald-600 shrink-0"><MapPin size={16} /></div>
                    <input
                      type="text" placeholder={view.level === 'campus' ? "Select or search building, gate, parking..." : "Select start room, lab, entrance..."}
                      value={sourceQuery}
                      onChange={(e) => { setSourceQuery(e.target.value); if (sourceObj) setSourceObj(null); setIsSearchingSource(true); }}
                      onFocus={() => setIsSearchingSource(true)}
                      className="w-full py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                    {sourceQuery && <button onClick={clearSource} className="text-slate-400 hover:text-slate-600 p-1"><X size={13} /></button>}
                    <button onClick={() => setIsSearchingSource(!isSearchingSource)} className="text-slate-400 hover:text-slate-600 p-1"><ChevronDown size={13} /></button>
                  </div>
                  <button
                    onClick={() => setPickMode(pickMode === 'start' ? null : 'start')}
                    title="Pick Start Location directly on Map"
                    className={`px-2.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border shrink-0 ${pickMode === 'start' ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300 animate-pulse' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'}`}
                  >
                    <Crosshair size={13} />
                    <span className="hidden sm:inline">Pick</span>
                  </button>
                </div>

                {isSearchingSource && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 overflow-hidden flex flex-col max-h-64">
                    {/* Scope Switcher: Current Map vs Whole Campus */}
                    <div className="flex bg-slate-50 border-b border-slate-200 p-1 gap-1 text-[11px] font-semibold">
                      <button
                        onClick={() => setDropdownScope('current')}
                        className={`flex-1 py-1 rounded-md transition-colors ${dropdownScope === 'current' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        {view.level === 'campus' ? '🏫 Campus Map' : view.level === 'room' ? '🚪 Room Interior' : '📐 Current Floor'}
                      </button>
                      <button
                        onClick={() => setDropdownScope('all')}
                        className={`flex-1 py-1 rounded-md transition-colors ${dropdownScope === 'all' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        🌐 Whole Campus
                      </button>
                    </div>

                    <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                      {sourceMatches.map(match => {
                        const bld = buildingMap.get(match.buildingId); const flr = floorMap.get(match.floorId);
                        return (
                          <div key={match.id} onMouseDown={() => selectSource(match)} className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors">
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{typeof match.name === 'string' ? match.name : match.name?.en}</p>
                              <p className="text-[10px] text-slate-400">{match.code ? `${match.code} • ` : ''}{bld?.name.en || 'Campus'}{flr ? ` • L${flr.level}` : ''}</p>
                            </div>
                            <span className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{match.category.replace(/_/g, ' ')}</span>
                          </div>
                        );
                      })}
                      {sourceMatches.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400">No matching destinations found.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Destination */}
              <div className="relative">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 pr-2">
                    <div className="w-8 flex items-center justify-center text-red-600 shrink-0"><Navigation size={16} /></div>
                    <input
                      type="text" placeholder={view.level === 'campus' ? "Select or search destination building, lab..." : "Select destination room, lab, office..."}
                      value={destQuery}
                      onChange={(e) => { setDestQuery(e.target.value); if (destObj) setDestObj(null); setIsSearchingDest(true); }}
                      onFocus={() => setIsSearchingDest(true)}
                      className="w-full py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                    {destQuery && <button onClick={clearDest} className="text-slate-400 hover:text-slate-600 p-1"><X size={13} /></button>}
                    <button onClick={() => setIsSearchingDest(!isSearchingDest)} className="text-slate-400 hover:text-slate-600 p-1"><ChevronDown size={13} /></button>
                  </div>
                  <button
                    onClick={() => setPickMode(pickMode === 'dest' ? null : 'dest')}
                    title="Pick Destination directly on Map"
                    className={`px-2.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border shrink-0 ${pickMode === 'dest' ? 'bg-red-600 text-white border-red-600 ring-2 ring-red-300 animate-pulse' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'}`}
                  >
                    <Crosshair size={13} />
                    <span className="hidden sm:inline">Pick</span>
                  </button>
                </div>

                {isSearchingDest && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 overflow-hidden flex flex-col max-h-64">
                    {/* Scope Switcher: Current Map vs Whole Campus */}
                    <div className="flex bg-slate-50 border-b border-slate-200 p-1 gap-1 text-[11px] font-semibold">
                      <button
                        onClick={() => setDropdownScope('current')}
                        className={`flex-1 py-1 rounded-md transition-colors ${dropdownScope === 'current' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        {view.level === 'campus' ? '🏫 Campus Map' : view.level === 'room' ? '🚪 Room Interior' : '📐 Current Floor'}
                      </button>
                      <button
                        onClick={() => setDropdownScope('all')}
                        className={`flex-1 py-1 rounded-md transition-colors ${dropdownScope === 'all' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        🌐 Whole Campus
                      </button>
                    </div>

                    <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                      {destMatches.map(match => {
                        const bld = buildingMap.get(match.buildingId); const flr = floorMap.get(match.floorId);
                        return (
                          <div key={match.id} onMouseDown={() => selectDest(match)} className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors">
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{typeof match.name === 'string' ? match.name : match.name?.en}</p>
                              <p className="text-[10px] text-slate-400">{match.code ? `${match.code} • ` : ''}{bld?.name.en || 'Campus'}{flr ? ` • L${flr.level}` : ''}</p>
                            </div>
                            <span className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{match.category.replace(/_/g, ' ')}</span>
                          </div>
                        );
                      })}
                      {destMatches.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400">No matching destinations found.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mode Toggles */}
              <div className="flex gap-2 pt-1">
                {(['walking', 'vehicle'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${mode === m ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                    {m === 'walking' ? <Footprints size={14} /> : <Car size={14} />}
                    {m === 'walking' ? 'Walking' : 'Vehicle'}
                  </button>
                ))}
                <button onClick={() => setAccessible(!accessible)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${accessible ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                  <User size={14} /> Accessible
                </button>
              </div>

              <button
                onClick={() => calculateRoute(sourceObj, destObj, mode, accessible)}
                disabled={!sourceObj || !destObj || isCalculating}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Compass size={16} /> {isCalculating ? 'Calculating...' : 'Find Route'}
              </button>
            </div>

            {/* Quick Find */}
            {!route && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Find Nearby</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Main Entrance', cat: 'entrance', color: 'bg-orange-100 text-orange-700 border-orange-200' },
                    { label: 'Restrooms', cat: 'amenity', color: 'bg-blue-100 text-blue-700 border-blue-200' },
                    { label: 'Labs', cat: 'lab', color: 'bg-purple-100 text-purple-700 border-purple-200' },
                    { label: 'Auditorium', cat: 'auditorium', color: 'bg-rose-100 text-rose-700 border-rose-200' },
                    { label: 'Landmark', cat: 'landmark', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                  ].map(chip => (
                    <button key={chip.cat} onClick={() => { const m = objects.find(o => o.category === chip.cat); if (m) selectDest(m); }} className={`px-3 py-1 rounded-full text-xs font-semibold border ${chip.color}`}>{chip.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div><p className="font-semibold">Unable to route</p><p className="mt-0.5">{error}</p></div>
              </div>
            )}

            {/* Route Result */}
            {route && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1 mb-1"><Footprints size={12} /> Distance</div>
                    <div className="text-2xl font-black text-slate-800">{route.totalDistanceMeters >= 1000 ? `${(route.totalDistanceMeters / 1000).toFixed(2)} km` : `${route.totalDistanceMeters.toFixed(0)} m`}</div>
                  </div>
                  <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1 mb-1"><Clock size={12} /> Est. Time</div>
                    <div className="text-2xl font-black text-slate-800">{Math.ceil(route.estimatedTimeSeconds / 60)} <span className="text-xs font-medium text-slate-500">min</span></div>
                  </div>
                </div>
                {routeFloors.length > 1 && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900 space-y-2">
                    <div className="font-semibold flex items-center gap-1.5"><Layers size={14} className="text-indigo-600" /> Multi-floor Route ({routeFloors.length} Floors)</div>
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {routeFloors.map((flr, idx) => (
                        <React.Fragment key={flr.id}>
                          <button onClick={() => flr.buildingId && enterFloor(flr.id, flr.buildingId)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${currentFloorId === flr.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100'}`}>L{flr.level}</button>
                          {idx < routeFloors.length - 1 && <ChevronRight size={14} className="text-indigo-300 shrink-0" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-xs uppercase text-slate-600 tracking-wider flex items-center justify-between">
                    <span>Directions</span>
                    <span className="text-[10px] font-normal text-slate-400">{route.steps?.length || route.transitions.length} steps</span>
                  </div>
                  <div className="p-4 space-y-3.5 max-h-[380px] overflow-y-auto">
                    {route.steps && route.steps.length > 0 ? route.steps.map(st => (
                      <div key={st.stepIndex} onClick={() => { if (st.floorId) { const flr = floorMap.get(st.floorId); if (flr?.buildingId) enterFloor(st.floorId, flr.buildingId); } }} className="flex gap-3 text-xs cursor-pointer group hover:bg-blue-50/50 p-1.5 rounded-lg transition-colors">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:border-blue-300">{renderTurnIcon(st.turnType)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 leading-snug">{st.instruction}</p>
                          {st.distanceMeters > 0 && <p className="text-[10px] text-slate-400 mt-0.5">{st.distanceMeters} m • ~{st.durationSeconds}s</p>}
                        </div>
                      </div>
                    )) : route.transitions.map((t, idx) => (
                      <div key={idx} className="flex gap-3 text-xs">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">{idx + 1}</div>
                        <div>
                          <p className="font-medium text-slate-800">{t.description}</p>
                          {t.fromFloorId && t.toFloorId && <p className="text-[10px] text-indigo-600 mt-0.5 flex items-center gap-1"><Layers size={10} /> Floor {t.fromFloorId} → {t.toFloorId}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 p-5 text-center text-slate-500 flex flex-col justify-center items-center">
            <Bot size={48} className="mb-4 text-indigo-300" />
            <p className="font-semibold text-slate-700">AI Assistant</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">Interact with the contextual AI Assistant for intelligent queries, schedule requests, or spatial guidance.</p>
          </div>
        )}
      </div>

      {/* Main Map Area */}
      <div className="flex-1 flex flex-col relative h-full">
        {activeTab === 'ai' ? (
          <AIAssistantPage />
        ) : (
          <>
            {/* Pick on Map Active Notification Banner */}
            {pickMode && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-2xl border border-slate-700 animate-bounce">
                <Crosshair size={16} className={pickMode === 'start' ? 'text-emerald-400' : 'text-red-400'} />
                <span className="text-xs font-medium">
                  Click any building, room, entrance, or point on the map to set <strong>{pickMode === 'start' ? 'Start Location' : 'Destination'}</strong>
                </span>
                <button
                  onClick={() => setPickMode(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-0.5 rounded-full transition-colors ml-1"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Top Bar: Breadcrumb + Controls */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 pointer-events-none">
              {/* Breadcrumb pill */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-slate-200 px-3 py-1.5 flex items-center gap-1.5 pointer-events-auto text-xs font-medium text-slate-700 max-w-[520px] overflow-hidden">
                {breadcrumb.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <ChevronRight size={12} className="text-slate-300 shrink-0" />}
                    {crumb.action ? (
                      <button onClick={crumb.action} className="text-blue-600 hover:text-blue-800 font-semibold truncate">{crumb.label}</button>
                    ) : (
                      <span className="font-bold text-slate-900 truncate">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* DB Dump & Seed Link */}
              <Link
                to="/admin/settings"
                className="bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-slate-200 px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-300 transition-colors pointer-events-auto"
                title="Export or Seed Database"
              >
                <Database size={13} className="text-blue-600" />
                <span className="hidden sm:inline">DB Dump & Seed</span>
              </Link>
            </div>

            {/* Top Right Controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              {/* Back / Exit buttons when inside a building */}
              {view.level !== 'campus' && (
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-slate-200 overflow-hidden flex items-center gap-0.5 p-1">
                  <button onClick={goBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">
                    <ArrowLeft size={13} /> Back
                  </button>
                  <button onClick={exitToOutdoor} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors border-l border-slate-200">
                    <LogOut size={13} /> Exit
                  </button>
                </div>
              )}

              {/* Floor switcher (inside building) */}
              {(view.level === 'floor' || view.level === 'room') && view.buildingId && (
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-slate-200 overflow-hidden flex items-center p-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 px-2.5">Floors</span>
                  <div className="flex gap-1">
                    {floors.filter(f => f.buildingId === view.buildingId).sort((a, b) => a.level - b.level).map(f => {
                      const isActive = currentFloorId === f.id;
                      return (
                        <button key={f.id} onClick={() => enterFloor(f.id, view.buildingId!)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}>
                          L{f.level}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mobile Drawer Toggle */}
              <button onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)} className="md:hidden bg-white/95 backdrop-blur-sm rounded-xl p-2.5 shadow-md border border-slate-200 text-slate-700 hover:bg-slate-50" title="Toggle directions sidebar">
                <Search size={18} />
              </button>
            </div>

            {/* Stair / Elevator Floor Picker Modal */}
            {floorPickerOpen && floorPickerContext && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{floorPickerContext.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Select floor to navigate to</p>
                    </div>
                    <button onClick={() => setFloorPickerOpen(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={18} /></button>
                  </div>
                  <div className="space-y-2">
                    {pickerFloors.map(f => (
                      <button
                        key={f.id}
                        onClick={() => { enterFloor(f.id, view.buildingId!); setFloorPickerOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-sm font-semibold text-slate-800 transition-colors"
                      >
                        <span>Level {f.level} – {typeof f.name === 'string' ? f.name : f.name.en}</span>
                        <ChevronRight size={16} className="text-slate-400" />
                      </button>
                    ))}
                    {pickerFloors.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">No other floors in this building.</p>
                    )}
                  </div>
                  <button onClick={() => setFloorPickerOpen(false)} className="w-full py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-medium">Cancel</button>
                </div>
              </div>
            )}

            {/* The Map Canvas */}
            <div className="flex-1 w-full h-full">
              <MapViewer
                objects={objects}
                nodes={nodes}
                connections={connections}
                routeResult={route}
                currentFloorId={currentFloorId}
                sourceObj={sourceObj}
                destObj={destObj}
                onSelectAsSource={selectSource}
                onSelectAsDestination={selectDest}
                shapes={editorShapes}
                onShapeClick={handleShapeClick}
                isRoomView={view.level === 'room'}
                isCampusView={view.level === 'campus' || view.level === 'building'}
                pickMode={pickMode}
                onCanvasPick={handleCanvasPick}
                pinPositions={{ source: visibleSourcePin, dest: visibleDestPin }}
                floorEntrancePositions={floorEntrancePositions}
                onPinDrag={handlePinDrag}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
