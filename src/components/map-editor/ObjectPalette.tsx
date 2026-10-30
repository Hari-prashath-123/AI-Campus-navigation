import React, { useEffect, useState } from 'react';
import { ObjectType, Building, MapObject, EditorTool } from '../../types';
import { SpatialNodeType } from '../../types/connection';
import { objectTypeService } from '../../api/object-type.service';
import { campusService } from '../../api/campus.service';
import { objectService } from '../../api/object.service';
import {
  Search, Loader2, Library, MapPin, MousePointer2, Hand, Square,
  Circle, Hexagon, Minus, GitBranch, PenTool, ChevronDown, ArrowUpDown
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
}

export const ObjectPalette: React.FC<ObjectPaletteProps> = ({ 
  onSelectType, activeTypeId, campusId, floorId, placedObjectIds = [], onSelectUnplaced,
  activeTool = 'select', onSelectTool, nodeTypeToCreate = 'hallway', onSelectNodeType
}) => {
  const [activeTab, setActiveTab] = useState<'tools' | 'library' | 'unplaced'>('tools');
  const [types, setTypes] = useState<ObjectType[]>([]);
  const [unplacedBuildings, setUnplacedBuildings] = useState<Building[]>([]);
  const [unplacedObjects, setUnplacedObjects] = useState<MapObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isNodeDropdownOpen, setIsNodeDropdownOpen] = useState(false);

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
            setUnplacedObjects(oRes.data.filter(o => !placedObjectIds.includes(o.id)));
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
    { id: 'line', label: 'Path / Wall Line', shortcut: 'L', icon: Minus, section: 'shape' },
    { id: 'point', label: 'Point POI', shortcut: 'M', icon: MapPin, section: 'shape' },
  ];

  const nodeTypes: { type: SpatialNodeType; label: string; color: string }[] = [
    { type: 'hallway', label: 'Hallway Waypoint', color: 'bg-blue-500' },
    { type: 'door', label: 'Door Transition', color: 'bg-amber-500' },
    { type: 'stairs', label: 'Staircase Access', color: 'bg-purple-500' },
    { type: 'elevator', label: 'Elevator Shaft', color: 'bg-emerald-500' },
    { type: 'entrance', label: 'Main Entrance', color: 'bg-pink-500' },
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
                    {nodeTypes.map(nt => (
                      <button
                        key={nt.type}
                        onClick={() => {
                          onSelectNodeType?.(nt.type);
                          onSelectTool?.('add_node');
                          setIsNodeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-left hover:bg-slate-50 transition-colors ${
                          nodeTypeToCreate === nt.type ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${nt.color}`} />
                        <span>{nt.label}</span>
                      </button>
                    ))}
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
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input 
                type="text" 
                placeholder="Filter unplaced..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {campusId && !floorId && filteredBuildings.length === 0 && (
              <div className="text-center p-6 text-xs text-slate-400">All campus buildings are placed!</div>
            )}
            {floorId && filteredObjects.length === 0 && (
              <div className="text-center p-6 text-xs text-slate-400">All floor objects are placed!</div>
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

            {floorId && filteredObjects.map(o => (
              <button
                key={o.id}
                onClick={() => onSelectUnplaced?.({ 
                  id: o.id, 
                  name: typeof o.name === 'string' ? o.name : o.name.en, 
                  category: o.category, 
                  type: 'object' 
                })}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-slate-50 border border-transparent transition-colors"
              >
                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600">
                  <icons.Box size={15} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-medium text-slate-900 truncate">
                    {typeof o.name === 'string' ? o.name : o.name.en}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{o.category} • {o.code}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
