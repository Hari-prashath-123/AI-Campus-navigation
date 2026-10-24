import React, { useState, useEffect } from 'react';
import { campusService } from '../api/campus.service';
import { objectService } from '../api/object.service';
import { routingService } from '../api/routing.service';
import { INITIAL_NODES } from '../api/mock-data'; // For map rendering
import { Campus, Floor, MapObject } from '../types';
import { MapViewer } from '../components/MapViewer';
import { Navigation, User, Car, MapPin, Layers, Bot } from 'lucide-react';
import { AIAssistantPage } from './AIAssistantPage'; // We can embed or adapt it, but let's build a simple chat here or conditionally render it.

export const UserNavigationPage: React.FC = () => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string>('');
  
  const [floors, setFloors] = useState<Floor[]>([]);
  const [objects, setObjects] = useState<MapObject[]>([]);
  
  const [currentFloorId, setCurrentFloorId] = useState<string>('');
  
  const [sourceQuery, setSourceQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  
  const [sourceObj, setSourceObj] = useState<MapObject | null>(null);
  const [destObj, setDestObj] = useState<MapObject | null>(null);

  const [mode, setMode] = useState<'walking' | 'vehicle'>('walking');
  const [accessible, setAccessible] = useState(false);
  
  const [route, setRoute] = useState<any>(null);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<'nav' | 'ai'>('nav');

  useEffect(() => {
    campusService.getCampuses().then(res => {
      if (res.success) {
        setCampuses(res.data);
        if (res.data.length > 0) setSelectedCampus(res.data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedCampus) return;
    
    // Load campus data
    objectService.getObjectsByCampus(selectedCampus).then(res => {
      if (res.success) setObjects(res.data);
    });

    // In a real app we'd fetch buildings and floors. We mock it for the current campus:
    import('../api/mock-data').then(({ INITIAL_FLOORS }) => {
      const flrs = INITIAL_FLOORS.filter(f => f.campusId === selectedCampus);
      setFloors(flrs);
      if (flrs.length > 0 && !currentFloorId) {
        setCurrentFloorId(flrs[0].id);
      }
    });
  }, [selectedCampus]);

  const handleSearchSource = async () => {
    if (!sourceQuery) return;
    const res = await objectService.searchObjects(selectedCampus, sourceQuery);
    if (res.success && res.data.length > 0) {
      setSourceObj(res.data[0]);
      setSourceQuery(res.data[0].name.en as string);
    } else {
      setError('Source not found');
    }
  };

  const handleSearchDest = async () => {
    if (!destQuery) return;
    const res = await objectService.searchObjects(selectedCampus, destQuery);
    if (res.success && res.data.length > 0) {
      setDestObj(res.data[0]);
      setDestQuery(res.data[0].name.en as string);
    } else {
      setError('Destination not found');
    }
  };

  const handleCalculateRoute = async () => {
    if (!sourceObj || !destObj) {
      setError('Please select both source and destination');
      return;
    }
    setError('');
    
    const res = await routingService.calculateRoute(selectedCampus, sourceObj.id, destObj.id, {
      accessibleOnly: accessible,
      mode,
      blockedConnectionIds: []
    });

    if (res.success && res.data) {
      setRoute(res.data);
      // Auto-switch to the starting floor if we had path nodes
      if (res.data.nodes && res.data.nodes.length > 0) {
        // Find floor of first node
        const firstNode = INITIAL_NODES.find(n => n.id === res.data.nodes[0]);
        if (firstNode?.floorId) {
          setCurrentFloorId(firstNode.floorId);
        }
      }
    } else {
      setError((res as any).message || 'Route not found');
      setRoute(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 w-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-[400px] shrink-0 bg-white border-r border-slate-200 flex flex-col z-10 shadow-sm">
        
        {/* Header Tabs */}
        <div className="flex border-b border-slate-200">
          <button 
            className={`flex-1 py-4 font-semibold text-sm flex items-center justify-center gap-2 ${activeTab === 'nav' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
            onClick={() => setActiveTab('nav')}
          >
            <Navigation size={18} /> Navigation
          </button>
          <button 
            className={`flex-1 py-4 font-semibold text-sm flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
            onClick={() => setActiveTab('ai')}
          >
            <Bot size={18} /> AI Assistant
          </button>
        </div>

        {activeTab === 'nav' ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Campus Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Campus</label>
              <select 
                value={selectedCampus} 
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{typeof c.name === 'string' ? c.name : c.name.en}</option>
                ))}
              </select>
            </div>

            {/* Routing Inputs */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Starting Point..." 
                  value={sourceQuery}
                  onChange={(e) => setSourceQuery(e.target.value)}
                  onBlur={handleSearchSource}
                  onKeyDown={e => e.key === 'Enter' && handleSearchSource()}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <Navigation size={16} className="absolute left-3 top-2.5 text-blue-500" />
                <input 
                  type="text" 
                  placeholder="Destination..." 
                  value={destQuery}
                  onChange={(e) => setDestQuery(e.target.value)}
                  onBlur={handleSearchDest}
                  onKeyDown={e => e.key === 'Enter' && handleSearchDest()}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Preferences */}
              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => setMode('walking')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex justify-center gap-1.5 items-center border ${mode === 'walking' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  <User size={14} /> Walking
                </button>
                <button 
                  onClick={() => setMode('vehicle')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex justify-center gap-1.5 items-center border ${mode === 'vehicle' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  <Car size={14} /> Vehicle
                </button>
                <button 
                  onClick={() => setAccessible(!accessible)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium border ${accessible ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  ♿ Access
                </button>
              </div>

              <button 
                onClick={handleCalculateRoute}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors shadow-sm mt-2"
              >
                Find Route
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}

            {/* Route Instructions Panel */}
            {route && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 p-3 rounded-xl text-center shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Distance</div>
                    <div className="text-xl font-black text-slate-800">{route.totalDistanceMeters.toFixed(0)} <span className="text-sm font-medium text-slate-500">m</span></div>
                  </div>
                  <div className="bg-white border border-slate-200 p-3 rounded-xl text-center shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Time</div>
                    <div className="text-xl font-black text-slate-800">{Math.ceil(route.estimatedTimeSeconds / 60)} <span className="text-sm font-medium text-slate-500">min</span></div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-semibold text-sm text-slate-700">
                    Step-by-step
                  </div>
                  <div className="p-4 space-y-4">
                    {route.transitions && route.transitions.map((t: any, idx: number) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </div>
                          {idx !== route.transitions.length - 1 && (
                            <div className="w-0.5 h-full bg-blue-100 my-1" />
                          )}
                        </div>
                        <div className="pt-0.5 pb-4">
                          <div className="text-sm font-medium text-slate-800">{t.description}</div>
                          {t.type === 'staircase' || t.type === 'elevator' ? (
                            <div className="text-xs text-indigo-500 mt-1 flex items-center gap-1">
                              <Layers size={12} /> {t.fromFloorId || 'Floor'} → {t.toFloorId || 'Floor'}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {(!route.transitions || route.transitions.length === 0) && (
                      <div className="text-sm text-slate-500">Head directly to the destination.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 p-5 text-center text-slate-500 flex flex-col justify-center items-center">
             <Bot size={48} className="mb-4 text-indigo-300" />
             <p className="font-semibold text-slate-700">AI Assistant Active</p>
             <p className="text-sm">Use the panel on the right to interact with the AI.</p>
          </div>
        )}
      </div>

      {/* Main View Area (Map or AI) */}
      <div className="flex-1 flex flex-col bg-slate-100 relative">
        {activeTab === 'ai' ? (
           <AIAssistantPage />
        ) : (
          <>
            {/* Top Floating Controls for Floors */}
        <div className="absolute top-4 right-4 bg-white rounded-xl shadow-md border border-slate-200 flex flex-col overflow-hidden z-20">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
            Floors
          </div>
          <div className="flex flex-col">
            {floors.map(f => (
              <button
                key={f.id}
                onClick={() => setCurrentFloorId(f.id)}
                className={`px-4 py-2 text-sm font-medium border-b border-slate-100 last:border-0 transition-colors ${
                  currentFloorId === f.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {typeof f.name === 'string' ? f.name : f.name.en}
              </button>
            ))}
          </div>
        </div>

        {/* The Map */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
          <MapViewer 
            objects={objects}
            nodes={INITIAL_NODES}
            routeResult={route}
            currentFloorId={currentFloorId}
            width={1200}
            height={800}
            onObjectClick={(obj) => {
              if (activeTab === 'nav') {
                setDestObj(obj);
                setDestQuery(typeof obj.name === 'string' ? obj.name : (obj.name.en as string));
              }
            }}
          />
        </div>
          </>
        )}
      </div>
    </div>
  );
};
