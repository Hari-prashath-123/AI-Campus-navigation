import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { campusService } from '../api/campus.service';
import { objectService } from '../api/object.service';
import { routingService, RouteResult, RouteStep } from '../api/routing.service';
import { navStore } from '../api/nav.store';
import { Campus, Floor, Building, MapObject, SpatialNode } from '../types';
import { CampusConnection } from '../types/connection';
import { MapViewer } from '../components/MapViewer';
import {
  Navigation, User, Car, MapPin, Layers, Bot, ArrowUpDown,
  Search, X, Check, AlertCircle, CornerUpLeft, CornerUpRight,
  ArrowUp, Compass, ChevronRight, Building2,
  Clock, Footprints,
} from 'lucide-react';
import { AIAssistantPage } from './AIAssistantPage';

export const UserNavigationPage: React.FC = () => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string>('');
  
  const [floors, setFloors] = useState<Floor[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [objects, setObjects] = useState<MapObject[]>([]);
  const [nodes, setNodes] = useState<SpatialNode[]>([]);
  const [connections, setConnections] = useState<CampusConnection[]>([]);
  
  const [currentFloorId, setCurrentFloorId] = useState<string>('');
  
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

  // 1. Load available campuses
  useEffect(() => {
    campusService.getCampuses().then(res => {
      if (res.success && res.data.length > 0) {
        setCampuses(res.data);
        setSelectedCampus(res.data[0].id);
      }
    });
  }, []);

  // 2. Load campus spatial database (buildings, floors, objects, graph nodes & connections)
  useEffect(() => {
    if (!selectedCampus) return;
    
    Promise.all([
      campusService.getFloorsByCampus(selectedCampus),
      campusService.getBuildingsByCampus(selectedCampus),
      objectService.getObjectsByCampus(selectedCampus),
    ]).then(([floorsRes, bldRes, objsRes]) => {
      if (floorsRes.success) {
        setFloors(floorsRes.data);
        if (floorsRes.data.length > 0) {
          setCurrentFloorId(prev => floorsRes.data.some(f => f.id === prev) ? prev : floorsRes.data[0].id);
        }
      }
      if (bldRes.success) setBuildings(bldRes.data);
      if (objsRes.success) setObjects(objsRes.data);

      const campusNodes = navStore.getNodesByCampus(selectedCampus);
      const campusConns = navStore.getConnectionsByCampus(selectedCampus);
      setNodes(campusNodes);
      setConnections(campusConns);
    });

    // Reset route when campus switches
    setSourceObj(null);
    setDestObj(null);
    setSourceQuery('');
    setDestQuery('');
    setRoute(null);
    setError('');
  }, [selectedCampus]);

  // Compute building lookup
  const buildingMap = useMemo(() => {
    return new Map(buildings.map(b => [b.id, b]));
  }, [buildings]);

  // Compute floor lookup
  const floorMap = useMemo(() => {
    return new Map(floors.map(f => [f.id, f]));
  }, [floors]);

  // Search filtering for Source autocomplete
  const sourceMatches = useMemo(() => {
    if (!sourceQuery.trim() || sourceObj) return [];
    const q = sourceQuery.toLowerCase().trim();
    return objects.filter(o => {
      const name = (typeof o.name === 'string' ? o.name : o.name?.en || '').toLowerCase();
      const code = (o.code || '').toLowerCase();
      const cat = (o.category || '').toLowerCase();
      return name.includes(q) || code.includes(q) || cat.includes(q);
    }).slice(0, 8);
  }, [objects, sourceQuery, sourceObj]);

  // Search filtering for Destination autocomplete
  const destMatches = useMemo(() => {
    if (!destQuery.trim() || destObj) return [];
    const q = destQuery.toLowerCase().trim();
    return objects.filter(o => {
      const name = (typeof o.name === 'string' ? o.name : o.name?.en || '').toLowerCase();
      const code = (o.code || '').toLowerCase();
      const cat = (o.category || '').toLowerCase();
      return name.includes(q) || code.includes(q) || cat.includes(q);
    }).slice(0, 8);
  }, [objects, destQuery, destObj]);

  // Core route calculation
  const calculateRoute = useCallback(async (
    start: MapObject | null,
    end: MapObject | null,
    travelMode: 'walking' | 'vehicle',
    accessibleOnly: boolean
  ) => {
    if (!start || !end) {
      setRoute(null);
      setError('');
      return;
    }

    if (start.id === end.id) {
      setError('Start and destination cannot be the same location.');
      setRoute(null);
      return;
    }

    setIsCalculating(true);
    setError('');

    try {
      const res = await routingService.calculateRoute(selectedCampus, start.id, end.id, {
        accessibleOnly,
        mode: travelMode,
        blockedConnectionIds: [],
        allowRestricted: false,
      });

      if (res.success && res.data && res.data.success) {
        setRoute(res.data);
        setError('');

        // Switch to the starting floor of the route
        if (start.floorId) {
          setCurrentFloorId(start.floorId);
        } else if (res.data.nodes.length > 0) {
          const firstNode = nodes.find(n => n.id === res.data.nodes[0]);
          if (firstNode?.floorId) setCurrentFloorId(firstNode.floorId);
        }
      } else {
        const errorMsg = res.data?.message || 'No traversable path exists between these locations.';
        setError(errorMsg);
        setRoute(null);
      }
    } catch (err: any) {
      setError(err.message || 'Routing service error occurred.');
      setRoute(null);
    } finally {
      setIsCalculating(false);
    }
  }, [selectedCampus, nodes]);

  // Trigger route calculation automatically when endpoints or preferences change
  useEffect(() => {
    if (sourceObj && destObj) {
      calculateRoute(sourceObj, destObj, mode, accessible);
    }
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

  const clearSource = () => {
    setSourceObj(null);
    setSourceQuery('');
    setRoute(null);
    setError('');
  };

  const clearDest = () => {
    setDestObj(null);
    setDestQuery('');
    setRoute(null);
    setError('');
  };

  const swapEndpoints = () => {
    const prevSrc = sourceObj;
    const prevSrcQ = sourceQuery;
    setSourceObj(destObj);
    setSourceQuery(destQuery);
    setDestObj(prevSrc);
    setDestQuery(prevSrcQ);
  };

  // Quick filter chips to populate destination
  const handleQuickCategorySelect = (category: string) => {
    const match = objects.find(o => o.category === category);
    if (match) {
      selectDest(match);
    }
  };

  // Floors visited by the active route
  const routeFloors = useMemo(() => {
    if (!route || !route.floors || route.floors.length === 0) return [];
    return route.floors
      .map(id => floorMap.get(id))
      .filter(Boolean) as Floor[];
  }, [route, floorMap]);

  // Turn step icon renderer
  const renderTurnIcon = (turnType: RouteStep['turnType']) => {
    switch (turnType) {
      case 'left':
      case 'slight_left':
        return <CornerUpLeft size={16} className="text-blue-600" />;
      case 'right':
      case 'slight_right':
        return <CornerUpRight size={16} className="text-blue-600" />;
      case 'elevator':
        return <Layers size={16} className="text-purple-600" />;
      case 'stairs':
        return <Layers size={16} className="text-amber-600" />;
      case 'depart':
        return <MapPin size={16} className="text-emerald-600" />;
      case 'arrive':
        return <Check size={16} className="text-red-600" />;
      default:
        return <ArrowUp size={16} className="text-blue-600" />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 w-full overflow-hidden relative">
      {/* Sidebar Controls */}
      <div className={`
        ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        w-full md:w-[420px] shrink-0 bg-white border-r border-slate-200 flex flex-col z-20 shadow-md transition-transform duration-200 absolute md:relative h-full
      `}>
        {/* Navigation / AI Tabs */}
        <div className="flex border-b border-slate-200">
          <button 
            className={`flex-1 py-3.5 font-semibold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'nav' ? 'text-blue-600 border-blue-600 bg-blue-50/20' : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('nav')}
          >
            <Navigation size={17} /> Navigation
          </button>
          <button 
            className={`flex-1 py-3.5 font-semibold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'ai' ? 'text-indigo-600 border-indigo-600 bg-indigo-50/20' : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
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

            {/* Origin & Destination Search Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 relative shadow-sm">
              {/* Swap Endpoints Button */}
              <button
                onClick={swapEndpoints}
                title="Swap starting point and destination"
                className="absolute right-3 top-[52px] w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors z-10"
              >
                <ArrowUpDown size={14} />
              </button>

              {/* Start Location Input */}
              <div className="relative">
                <div className="flex items-center bg-white border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 pr-2">
                  <div className="w-9 flex items-center justify-center text-emerald-600 shrink-0">
                    <MapPin size={16} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search start point, room, entrance..." 
                    value={sourceQuery}
                    onChange={(e) => {
                      setSourceQuery(e.target.value);
                      if (sourceObj) setSourceObj(null);
                      setIsSearchingSource(true);
                    }}
                    onFocus={() => setIsSearchingSource(true)}
                    className="w-full py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                  {sourceQuery && (
                    <button onClick={clearSource} className="text-slate-400 hover:text-slate-600 p-1">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Autocomplete dropdown for Source */}
                {isSearchingSource && sourceMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto">
                    {sourceMatches.map(match => {
                      const bld = buildingMap.get(match.buildingId);
                      const flr = floorMap.get(match.floorId);
                      return (
                        <div
                          key={match.id}
                          onMouseDown={() => selectSource(match)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-800">
                              {typeof match.name === 'string' ? match.name : match.name?.en}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {match.code} • {bld?.name.en || 'Building'} • L{flr?.level ?? 0}
                            </p>
                          </div>
                          <span className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {match.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Destination Input */}
              <div className="relative">
                <div className="flex items-center bg-white border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 pr-2">
                  <div className="w-9 flex items-center justify-center text-red-600 shrink-0">
                    <Navigation size={16} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search destination, lab, office..." 
                    value={destQuery}
                    onChange={(e) => {
                      setDestQuery(e.target.value);
                      if (destObj) setDestObj(null);
                      setIsSearchingDest(true);
                    }}
                    onFocus={() => setIsSearchingDest(true)}
                    className="w-full py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                  {destQuery && (
                    <button onClick={clearDest} className="text-slate-400 hover:text-slate-600 p-1">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Autocomplete dropdown for Destination */}
                {isSearchingDest && destMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto">
                    {destMatches.map(match => {
                      const bld = buildingMap.get(match.buildingId);
                      const flr = floorMap.get(match.floorId);
                      return (
                        <div
                          key={match.id}
                          onMouseDown={() => selectDest(match)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-800">
                              {typeof match.name === 'string' ? match.name : match.name?.en}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {match.code} • {bld?.name.en || 'Building'} • L{flr?.level ?? 0}
                            </p>
                          </div>
                          <span className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {match.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Travel Preferences */}
              <div className="pt-2 flex items-center gap-2">
                <button 
                  onClick={() => setMode('walking')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex justify-center gap-1.5 items-center border transition-colors ${
                    mode === 'walking' 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <User size={14} /> Walking
                </button>
                <button 
                  onClick={() => setMode('vehicle')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex justify-center gap-1.5 items-center border transition-colors ${
                    mode === 'vehicle' 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Car size={14} /> Vehicle
                </button>
                <button 
                  onClick={() => setAccessible(!accessible)}
                  title="Strictly exclude stairs and require elevator / ramp routes"
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors ${
                    accessible 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ♿ Accessible
                </button>
              </div>

              {/* Action Button */}
              <button 
                onClick={() => calculateRoute(sourceObj, destObj, mode, accessible)}
                disabled={isCalculating || !sourceObj || !destObj}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Compass size={16} />
                {isCalculating ? 'Computing route…' : 'Find Route'}
              </button>
            </div>

            {/* Quick Find Chips */}
            {!route && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Find Nearby</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '🚪 Main Entrance', cat: 'entrance' },
                    { label: '🚻 Restrooms', cat: 'accessible_restroom' },
                    { label: '🔬 Labs', cat: 'lab' },
                    { label: '🎭 Auditorium', cat: 'auditorium' },
                    { label: '🏛️ Landmark', cat: 'landmark' },
                  ].map(chip => (
                    <button
                      key={chip.cat}
                      onClick={() => handleQuickCategorySelect(chip.cat)}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 border border-slate-200 rounded-full text-xs text-slate-600 transition-colors"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200 flex items-start gap-2 animate-in fade-in">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Unable to route</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Route Overview & Step-by-Step Directions */}
            {route && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                {/* Distance & Time summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1 mb-1">
                      <Footprints size={12} /> Distance
                    </div>
                    <div className="text-2xl font-black text-slate-800">
                      {route.totalDistanceMeters >= 1000 
                        ? `${(route.totalDistanceMeters / 1000).toFixed(2)} km` 
                        : `${route.totalDistanceMeters.toFixed(0)} m`}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1 mb-1">
                      <Clock size={12} /> Est. Time
                    </div>
                    <div className="text-2xl font-black text-slate-800">
                      {Math.ceil(route.estimatedTimeSeconds / 60)} <span className="text-xs font-medium text-slate-500">min</span>
                    </div>
                  </div>
                </div>

                {/* Multi-floor transition summary banner */}
                {routeFloors.length > 1 && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900 space-y-2">
                    <div className="font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers size={14} className="text-indigo-600" />
                        Multi-floor Route ({routeFloors.length} Floors)
                      </span>
                    </div>
                    {/* Floor Stepper Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {routeFloors.map((flr, idx) => (
                        <React.Fragment key={flr.id}>
                          <button
                            onClick={() => setCurrentFloorId(flr.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              currentFloorId === flr.id
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                            }`}
                          >
                            L{flr.level}
                          </button>
                          {idx < routeFloors.length - 1 && (
                            <ChevronRight size={14} className="text-indigo-300 shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step-by-Step Directions */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-xs uppercase text-slate-600 tracking-wider flex items-center justify-between">
                    <span>Directions</span>
                    <span className="text-[10px] font-normal text-slate-400">
                      {route.steps?.length || route.transitions.length} steps
                    </span>
                  </div>
                  <div className="p-4 space-y-3.5 max-h-[380px] overflow-y-auto">
                    {route.steps && route.steps.length > 0 ? (
                      route.steps.map((st) => (
                        <div
                          key={st.stepIndex}
                          onClick={() => {
                            if (st.floorId) setCurrentFloorId(st.floorId);
                          }}
                          className="flex gap-3 text-xs cursor-pointer group hover:bg-blue-50/50 p-1.5 rounded-lg transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:border-blue-300">
                            {renderTurnIcon(st.turnType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 leading-snug">
                              {st.instruction}
                            </p>
                            {st.distanceMeters > 0 && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {st.distanceMeters} m • ~{st.durationSeconds}s
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      route.transitions.map((t, idx) => (
                        <div key={idx} className="flex gap-3 text-xs">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{t.description}</p>
                            {t.fromFloorId && t.toFloorId && (
                              <p className="text-[10px] text-indigo-600 mt-0.5 flex items-center gap-1">
                                <Layers size={10} /> Floor {t.fromFloorId} ➔ {t.toFloorId}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 p-5 text-center text-slate-500 flex flex-col justify-center items-center">
            <Bot size={48} className="mb-4 text-indigo-300" />
            <p className="font-semibold text-slate-700">AI Assistant</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Interact with the contextual AI Assistant for intelligent queries, schedule requests, or spatial guidance.
            </p>
          </div>
        )}
      </div>

      {/* Main Map Viewer Area */}
      <div className="flex-1 flex flex-col relative h-full">
        {activeTab === 'ai' ? (
          <AIAssistantPage />
        ) : (
          <>
            {/* Top Bar for Floor Switcher */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              {/* Floor Switcher Pill */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-slate-200 overflow-hidden flex items-center p-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 px-2.5">
                  Floors
                </span>
                <div className="flex gap-1">
                  {floors.map(f => {
                    const isVisitedByRoute = routeFloors.some(rf => rf.id === f.id);
                    const isActive = currentFloorId === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setCurrentFloorId(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                          isActive 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        L{f.level}
                        {isVisitedByRoute && !isActive && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Drawer Toggle */}
              <button
                onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                className="md:hidden bg-white/95 backdrop-blur-sm rounded-xl p-2.5 shadow-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                title="Toggle directions sidebar"
              >
                <Search size={18} />
              </button>
            </div>

            {/* The 2D Map Canvas */}
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
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
