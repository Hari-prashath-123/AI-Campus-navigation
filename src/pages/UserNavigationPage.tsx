import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Clock, Footprints, ArrowLeft, LogOut,
} from 'lucide-react';
import { AIAssistantPage } from './AIAssistantPage';

// ─── View level type ──────────────────────────────────────────────────────────
type ViewLevel = 'campus' | 'building' | 'floor' | 'room';

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

  // ─── Derive currentFloorId from view ───────────────────────────────────────
  const currentFloorId = view.floorId || '';

  // ─── Load 2D map shapes for current view ───────────────────────────────────
  useEffect(() => {
    if (!view.campusId) return;

    let shapes: EditorShape[] = [];

    if (view.level === 'room' && view.roomId && view.floorId && view.buildingId) {
      // Room interior: load room-specific shapes
      const roomKey = `editor-shapes-${view.campusId}-${view.buildingId}-${view.floorId}-${view.roomId}`;
      const raw = localStorage.getItem(roomKey);
      if (raw) {
        try { shapes = JSON.parse(raw); } catch (e) {}
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

  // ─── Lookups ────────────────────────────────────────────────────────────────
  const buildingMap = useMemo(() => new Map(buildings.map(b => [b.id, b])), [buildings]);
  const floorMap = useMemo(() => new Map(floors.map(f => [f.id, f])), [floors]);

  // ─── Drill-down navigation handlers ────────────────────────────────────────
  const enterBuilding = useCallback((buildingId: string) => {
    // Find ground floor (level 0 or lowest level)
    const bldFloors = floors.filter(f => f.buildingId === buildingId)
      .sort((a, b) => a.level - b.level);
    const groundFloor = bldFloors[0];
    if (!groundFloor) return;
    setView({ level: 'floor', campusId: selectedCampus, buildingId, floorId: groundFloor.id });
  }, [floors, selectedCampus]);

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
    if (view.level === 'campus') {
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
      crumbs.push({ label: bld?.name.en || 'Building', action: view.level !== 'building' ? () => setView({ level: 'building', campusId: view.campusId, buildingId: view.buildingId }) : undefined });
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

  // ─── Search filtering ───────────────────────────────────────────────────────
  const sourceMatches = useMemo(() => {
    if (!sourceQuery.trim() || sourceObj) return [];
    const q = sourceQuery.toLowerCase().trim();
    return objects.filter(o => {
      const name = (typeof o.name === 'string' ? o.name : o.name?.en || '').toLowerCase();
      return name.includes(q) || (o.code || '').toLowerCase().includes(q);
    }).slice(0, 8);
  }, [objects, sourceQuery, sourceObj]);

  const destMatches = useMemo(() => {
    if (!destQuery.trim() || destObj) return [];
    const q = destQuery.toLowerCase().trim();
    return objects.filter(o => {
      const name = (typeof o.name === 'string' ? o.name : o.name?.en || '').toLowerCase();
      return name.includes(q) || (o.code || '').toLowerCase().includes(q);
    }).slice(0, 8);
  }, [objects, destQuery, destObj]);

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
    setSourceObj(obj);
    setSourceQuery(typeof obj.name === 'string' ? obj.name : obj.name?.en || obj.code);
    setIsSearchingSource(false);
  };
  const selectDest = (obj: MapObject) => {
    setDestObj(obj);
    setDestQuery(typeof obj.name === 'string' ? obj.name : obj.name?.en || obj.code);
    setIsSearchingDest(false);
  };
  const clearSource = () => { setSourceObj(null); setSourceQuery(''); setRoute(null); setError(''); };
  const clearDest = () => { setDestObj(null); setDestQuery(''); setRoute(null); setError(''); };
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
                <div className="flex items-center bg-white border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 pr-2">
                  <div className="w-9 flex items-center justify-center text-emerald-600 shrink-0"><MapPin size={16} /></div>
                  <input
                    type="text" placeholder="Search start point, room, entrance..."
                    value={sourceQuery}
                    onChange={(e) => { setSourceQuery(e.target.value); if (sourceObj) setSourceObj(null); setIsSearchingSource(true); }}
                    onFocus={() => setIsSearchingSource(true)}
                    className="w-full py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                  {sourceQuery && <button onClick={clearSource} className="text-slate-400 hover:text-slate-600 p-1"><X size={14} /></button>}
                </div>
                {isSearchingSource && sourceMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto">
                    {sourceMatches.map(match => {
                      const bld = buildingMap.get(match.buildingId); const flr = floorMap.get(match.floorId);
                      return (
                        <div key={match.id} onMouseDown={() => selectSource(match)} className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{typeof match.name === 'string' ? match.name : match.name?.en}</p>
                            <p className="text-[10px] text-slate-400">{match.code} • {bld?.name.en || 'Building'} • L{flr?.level ?? 0}</p>
                          </div>
                          <span className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{match.category.replace(/_/g, ' ')}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Destination */}
              <div className="relative">
                <div className="flex items-center bg-white border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 pr-2">
                  <div className="w-9 flex items-center justify-center text-red-600 shrink-0"><Navigation size={16} /></div>
                  <input
                    type="text" placeholder="Search destination, lab, office..."
                    value={destQuery}
                    onChange={(e) => { setDestQuery(e.target.value); if (destObj) setDestObj(null); setIsSearchingDest(true); }}
                    onFocus={() => setIsSearchingDest(true)}
                    className="w-full py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                  {destQuery && <button onClick={clearDest} className="text-slate-400 hover:text-slate-600 p-1"><X size={14} /></button>}
                </div>
                {isSearchingDest && destMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto">
                    {destMatches.map(match => {
                      const bld = buildingMap.get(match.buildingId); const flr = floorMap.get(match.floorId);
                      return (
                        <div key={match.id} onMouseDown={() => selectDest(match)} className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{typeof match.name === 'string' ? match.name : match.name?.en}</p>
                            <p className="text-[10px] text-slate-400">{match.code} • {bld?.name.en || 'Building'} • L{flr?.level ?? 0}</p>
                          </div>
                          <span className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{match.category.replace(/_/g, ' ')}</span>
                        </div>
                      );
                    })}
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
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
