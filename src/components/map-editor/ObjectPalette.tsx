import React, { useEffect, useState } from 'react';
import { ObjectType, Building, MapObject, EditorTool } from '../../types';
import { SpatialNodeType } from '../../types/connection';
import { objectTypeService } from '../../api/object-type.service';
import { campusService } from '../../api/campus.service';
import { objectService } from '../../api/object.service';
import {
  Search, Loader2, Library, MapPin, MousePointer2, Hand, Square,
  Circle, Hexagon, Minus, GitBranch, PenTool, ChevronDown, ArrowUpDown,
  Navigation, DoorOpen, Plus
} from 'lucide-react';
import * as icons from 'lucide-react';

interface ObjectPaletteProps {
  onSelectType: (type: ObjectType) => void;
  activeTypeId: string | null;
  campusId?: string;
  floorId?: string;
  placedObjectIds?: string[];
  onSelectUnplaced?: (entity: { id: string; name: string; category: string; type: 'building' | 'object' }) => void;
  activeTool?: EditorTool;
  onSelectTool?: (tool: EditorTool) => void;
  nodeTypeToCreate?: SpatialNodeType;
  onSelectNodeType?: (type: SpatialNodeType) => void;
  canvasContainerRef?: React.RefObject<HTMLDivElement>;
  stageScale?: number;
  stagePosition?: { x: number; y: number };
  onRoomDrop?: (roomData: { id: string; name: string; category: string; code?: string }, canvasX: number, canvasY: number) => void;
  onRoomPlaceDirect?: (roomData: { id: string; name: string; category: string; code?: string }) => void;
}

export const ObjectPalette: React.FC<ObjectPaletteProps> = ({ 
  onSelectType, activeTypeId, campusId, floorId, placedObjectIds = [], onSelectUnplaced,
  activeTool = 'select', onSelectTool, nodeTypeToCreate = 'hallway', onSelectNodeType,
  canvasContainerRef, stageScale = 1, stagePosition = { x: 0, y: 0 }, onRoomDrop, onRoomPlaceDirect
}) => {
  const [activeTab, setActiveTab] = useState<'tools' | 'library' | 'unplaced'>('tools');
  const [types, setTypes] = useState<ObjectType[]>([]);
  const [unplacedBuildings, setUnplacedBuildings] = useState<Building[]>([]);
  const [unplacedObjects, setUnplacedObjects] = useState<MapObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isNodeDropdownOpen, setIsNodeDropdownOpen] = useState(false);
  const [isDeclaringRoom, setIsDeclaringRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCode, setNewRoomCode] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState('office');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Drag-and-drop listener on canvasContainerRef
  useEffect(() => {
    const container = canvasContainerRef?.current;
    if (!container) return;

    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('application/unplaced-room')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer?.getData('application/unplaced-room');
      if (!raw) return;
      try {
        const roomData = JSON.parse(raw);
        if (!roomData || !onRoomDrop) return;
        const rect = container.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;
        const canvasX = (rawX - stagePosition.x) / stageScale;
        const canvasY = (rawY - stagePosition.y) / stageScale;
        onRoomDrop(roomData, canvasX, canvasY);
      } catch (err) {}
    };

    container.addEventListener('dragover', onDragOver);
    container.addEventListener('drop', onDrop);
    return () => {
      container.removeEventListener('dragover', onDragOver);
      container.removeEventListener('drop', onDrop);
    };
  }, [canvasContainerRef, onRoomDrop, stageScale, stagePosition]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !floorId) return;
    setIsCreatingRoom(true);
    try {
      const code = newRoomCode.trim() || newRoomName.trim().toUpperCase().replace(/\s+/g, '-').slice(0, 10);
      const res = await objectService.createObject({
        campusId: campusId || 'default-campus',
        buildingId: '',
        floorId,
        code,
        name: { en: newRoomName.trim() },
        category: newRoomCategory,
        coordinates: { x: 0, y: 0 },
        associatedNodeId: '',
        isAccessible: true,
      });
      if (res.success && res.data) {
        setUnplacedObjects(prev => [...prev, res.data]);
        setNewRoomName('');
        setNewRoomCode('');
        setIsDeclaringRoom(false);
      }
    } finally {
      setIsCreatingRoom(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await objectTypeService.getAll();
        if (res.success) setTypes(res.data);

        if (campusId && !floorId) {
          const bRes = await campusService.getBuildingsByCampus(campusId);
          if (bRes.success && bRes.data) {
            setUnplacedBuildings(bRes.data.filter(b => !placedObjectIds.includes(b.id)));
          }
        } else if (floorId) {
          const oRes = await objectService.getObjectsByFloor(floorId);
          if (oRes.success && oRes.data) {
            // Exclude navigation/transit objects from unplaced rooms list
            const EXCLUDED_CATEGORIES = ['transit', 'navigation_path', 'outdoor'];
            const EXCLUDED_TYPES = ['navigation_path', 'navpath', 'hallway', 'corridor', 'pathway', 'walkway'];
            setUnplacedObjects(oRes.data.filter(o =>
              !placedObjectIds.includes(o.id) &&
              !EXCLUDED_CATEGORIES.includes((o.category || '').toLowerCase()) &&
              !EXCLUDED_TYPES.some(t => (o.objectTypeId || '').toLowerCase().includes(t)) &&
              !EXCLUDED_TYPES.some(t => (typeof o.name === 'string' ? o.name : o.name.en || '').toLowerCase().startsWith(t))
            ));
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line
  }, [campusId, floorId, placedObjectIds.length]);

  const filteredTypes = types.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const filteredBuildings = unplacedBuildings.filter(b => b.name.en.toLowerCase().includes(search.toLowerCase()));
  const filteredObjects = unplacedObjects.filter(o => o.name.en.toLowerCase().includes(search.toLowerCase()));

  const drawingTools = [
    { id: 'select', label: 'Select Object', shortcut: 'V', icon: MousePointer2, section: 'pointer' },
    { id: 'pan', label: 'Pan Canvas', shortcut: 'H', icon: Hand, section: 'pointer' },
    { id: 'rectangle', label: 'Rectangle Room', shortcut: 'R', icon: Square, section: 'shape' },
    { id: 'circle', label: 'Circle / Ellipse', shortcut: 'C', icon: Circle, section: 'shape' },
    { id: 'polygon', label: 'Polygon Area', shortcut: 'P', icon: Hexagon, section: 'shape' },
    { id: 'wall', label: 'Wall Line', shortcut: 'W', icon: Minus, section: 'shape' },
    { id: 'path', label: 'Navigation Path', shortcut: 'L', icon: Navigation, section: 'shape' },
    { id: 'point', label: 'Point POI', shortcut: 'M', icon: MapPin, section: 'shape' },
  ];

  const nodeTypes: { type: SpatialNodeType; label: string; color: string; icon?: any }[] = [
    { type: 'hallway', label: 'Hallway Waypoint', color: 'bg-blue-500' },
    { type: 'door', label: 'Door Transition', color: 'bg-amber-500', icon: DoorOpen },
    { type: 'stairs', label: 'Staircase Access', color: 'bg-purple-500' },
    { type: 'elevator', label: 'Elevator Shaft', color: 'bg-emerald-500' },
    { type: 'entrance', label: 'Main Entrance', color: 'bg-red-500', icon: Navigation },
    { type: 'outdoor_waypoint', label: 'Side Entrance', color: 'bg-orange-500', icon: Navigation },
    { type: 'ramp', label: 'Accessible Ramp', color: 'bg-teal-500' },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-full flex flex-col z-10 shadow-sm shrink-0">
      
      {/* Sidebar Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/50">
        <button 
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'tools' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          onClick={() => setActiveTab('tools')}
        >
          <PenTool size={13} /> Tools
        </button>
        <button 
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'library' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          onClick={() => setActiveTab('library')}
        >
          <Library size={13} /> Types
        </button>
        <button 
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'unplaced' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          onClick={() => setActiveTab('unplaced')}
        >
          <MapPin size={13} /> Unplaced
          {(unplacedBuildings.length + unplacedObjects.length) > 0 && (
            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
              {unplacedBuildings.length + unplacedObjects.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: DRAWING & NETWORK TOOLS */}
      {activeTab === 'tools' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          
          {/* Pointer Tools */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1 mb-1.5">
              Navigation & Selection
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {drawingTools.filter(t => t.section === 'pointer').map(t => {
                const Icon = t.icon;
                const isActive = activeTool === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTool?.(t.id as EditorTool)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                      isActive
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={15} />
                    <span className="truncate">{t.label.split(' ')[0]}</span>
                    <span className="ml-auto text-[10px] text-slate-400 font-mono">({t.shortcut})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shape Tools */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1 mb-1.5">
              Geometry & Rooms
            </span>
            <div className="space-y-1">
              {drawingTools.filter(t => t.section === 'shape').map(t => {
                const Icon = t.icon;
                const isActive = activeTool === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTool?.(t.id as EditorTool)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                      isActive
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon size={14} />
                      </div>
                      <span>{t.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">({t.shortcut})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Graph Tools */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1 mb-1.5">
              Graph Network
            </span>
            <div className="space-y-1.5">
              {/* Add Node tool with embedded type dropdown */}
              <div className="relative">
                <div className={`flex items-center rounded-lg border transition-all ${
                  activeTool === 'add_node'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm font-semibold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}>
                  <button
                    onClick={() => onSelectTool?.('add_node')}
                    className="flex-1 flex items-center gap-2 p-2 text-xs text-left"
                  >
                    <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <MapPin size={14} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="truncate leading-tight">Place Node</p>
                      <p className="text-[10px] text-emerald-600 capitalize truncate font-normal">{nodeTypeToCreate}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setIsNodeDropdownOpen(!isNodeDropdownOpen)}
                    className="p-2 border-l border-slate-200 hover:bg-black/5 rounded-r-lg"
                    title="Change Node Type"
                  >
                    <ChevronDown size={14} className={`transition-transform ${isNodeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {isNodeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-30">
                    {nodeTypes.map(nt => {
                      const isEntrance = nt.type === 'entrance' || nt.type === 'outdoor_waypoint';
                      const NtIcon = nt.icon;
                      return (
                        <button
                          key={nt.type}
                          onClick={() => {
                            onSelectNodeType?.(nt.type);
                            onSelectTool?.('add_node');
                            setIsNodeDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors"
                        >
                          {isEntrance && NtIcon ? (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${nt.color} text-white shrink-0`}>
                              <NtIcon size={11} />
                            </div>
                          ) : (
                            <div className={`w-3 h-3 rounded-full ${nt.color} shrink-0`} />
                          )}
                          <div>
                            <span className="block font-medium">{nt.label}</span>
                            {isEntrance && (
                              <span className="text-[10px] text-slate-400 block">
                                {nt.type === 'entrance' ? 'Click near building to set main entrance' : 'Click to add a secondary entrance'}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Connect Path tool */}
              <button
                onClick={() => onSelectTool?.('add_edge')}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                  activeTool === 'add_edge'
                    ? 'bg-purple-50 border-purple-400 text-purple-800 font-semibold shadow-sm'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center">
                    <GitBranch size={14} />
                  </div>
                  <span>Connect Path</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">(E)</span>
              </button>

              {/* Connect Floors tool */}
              <button
                onClick={() => onSelectTool?.('connect_floors')}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                  activeTool === 'connect_floors'
                    ? 'bg-blue-50 border-blue-400 text-blue-800 font-semibold shadow-sm'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center">
                    <ArrowUpDown size={14} />
                  </div>
                  <span>Connect Floors</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">(Stairs)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OBJECT TYPES LIBRARY */}
      {activeTab === 'library' && (
        <>
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input 
                type="text" 
                placeholder="Search types..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-300" /></div>
            ) : filteredTypes.length === 0 ? (
              <div className="text-center p-6 text-xs text-slate-400">No object types found.</div>
            ) : (
              filteredTypes.map(type => {
                const IconComp = (icons as any)[type.iconName] || icons.Box;
                const isActive = activeTypeId === type.id;
                
                return (
                  <button
                    key={type.id}
                    onClick={() => onSelectType(type)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-all ${
                      isActive ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div 
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 shadow-xs"
                      style={{ backgroundColor: `${type.color}15`, color: type.color }}
                    >
                      <IconComp size={15} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className={`text-xs font-medium truncate ${isActive ? 'text-blue-900 font-semibold' : 'text-slate-800'}`}>
                        {type.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate uppercase tracking-wider">
                        {type.category}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}

      {/* TAB 3: UNPLACED ITEMS */}
      {activeTab === 'unplaced' && (
        <>
          <div className="p-2.5 border-b border-slate-100 space-y-2">
            {/* Declare Room Action (Active when inside a floor) */}
            {floorId && (
              <div>
                {!isDeclaringRoom ? (
                  <button
                    type="button"
                    onClick={() => setIsDeclaringRoom(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    <Plus size={14} />
                    <span>+ Declare Room on Floor</span>
                  </button>
                ) : (
                  <form onSubmit={handleCreateRoom} className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-blue-900 text-[11px]">
                      <span>Declare New Room</span>
                      <button
                        type="button"
                        onClick={() => setIsDeclaringRoom(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-normal"
                      >
                        Cancel
                      </button>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Room Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Staff Room, HOD Cabin, Lab 1"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Room Code</label>
                        <input
                          type="text"
                          placeholder="e.g. SR-01"
                          value={newRoomCode}
                          onChange={(e) => setNewRoomCode(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Category</label>
                        <select
                          value={newRoomCategory}
                          onChange={(e) => setNewRoomCategory(e.target.value)}
                          className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="office">Staff Room / Office</option>
                          <option value="classroom">Classroom</option>
                          <option value="laboratory">Laboratory</option>
                          <option value="amenity">Restroom / Amenity</option>
                          <option value="cafeteria">Cafeteria / Canteen</option>
                          <option value="auditorium">Auditorium</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isCreatingRoom || !newRoomName.trim()}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded font-semibold text-xs transition-colors shadow-xs"
                    >
                      {isCreatingRoom ? 'Declaring Room...' : 'Create & Add to Unplaced'}
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input 
                type="text" 
                placeholder="Filter unplaced rooms..."
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {campusId && !floorId && filteredBuildings.length === 0 && (
              <div className="text-center p-6 text-xs text-slate-400">All campus buildings are placed!</div>
            )}
            {floorId && filteredObjects.length === 0 && !isDeclaringRoom && (
              <div className="text-center p-6 text-xs text-slate-500 space-y-2">
                <p>No unplaced rooms on this floor.</p>
                <p className="text-[11px] text-blue-600 font-medium cursor-pointer" onClick={() => setIsDeclaringRoom(true)}>
                  + Click to declare a room now
                </p>
              </div>
            )}

            {campusId && !floorId && filteredBuildings.map(b => (
              <button
                key={b.id}
                onClick={() => onSelectUnplaced?.({ id: b.id, name: b.name.en, category: 'building', type: 'building' })}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-slate-50 border border-transparent transition-colors"
              >
                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
                  <icons.Building2 size={15} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-medium text-slate-900 truncate">{b.name.en}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Building ({b.code})</p>
                </div>
              </button>
            ))}

            {floorId && filteredObjects.map(o => {
              const roomName = typeof o.name === 'string' ? o.name : o.name.en;
              return (
                <div
                  key={o.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/unplaced-room', JSON.stringify({
                      id: o.id,
                      name: roomName,
                      category: o.category,
                      code: o.code
                    }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <icons.DoorOpen size={13} />
                      </div>
                      <p className="text-xs font-semibold text-slate-800 truncate">{roomName}</p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-bold shrink-0">
                      {o.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                    <span>Code: {o.code}</span>
                    <span className="text-blue-600 font-medium">↕ Drag to canvas</span>
                  </div>
                  <div className="flex gap-1.5 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onRoomPlaceDirect?.({
                        id: o.id,
                        name: roomName,
                        category: o.category,
                        code: o.code
                      })}
                      className="flex-1 py-1 px-1.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[10px] transition-colors text-center"
                    >
                      Place in Center
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectUnplaced?.({
                        id: o.id,
                        name: roomName,
                        category: o.category,
                        type: 'object'
                      })}
                      className="flex-1 py-1 px-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[10px] transition-colors text-center"
                    >
                      Draw Box (R)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};