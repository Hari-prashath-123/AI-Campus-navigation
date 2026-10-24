import React, { useEffect, useState } from 'react';
import { ObjectType, Building, MapObject } from '../../types';
import { objectTypeService } from '../../api/object-type.service';
import { campusService } from '../../api/campus.service';
import { objectService } from '../../api/object.service';
import { Search, Loader2, Library, MapPin } from 'lucide-react';
import * as icons from 'lucide-react';

interface ObjectPaletteProps {
  onSelectType: (type: ObjectType) => void;
  activeTypeId: string | null;
  campusId?: string;
  floorId?: string;
  placedObjectIds?: string[];
  onSelectUnplaced?: (entity: { id: string; name: string; category: string; type: 'building' | 'object' }) => void;
}

export const ObjectPalette: React.FC<ObjectPaletteProps> = ({ 
  onSelectType, activeTypeId, campusId, floorId, placedObjectIds = [], onSelectUnplaced 
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'unplaced'>('library');
  const [types, setTypes] = useState<ObjectType[]>([]);
  const [unplacedBuildings, setUnplacedBuildings] = useState<Building[]>([]);
  const [unplacedObjects, setUnplacedObjects] = useState<MapObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
  return (
    <div className="w-64 bg-white border-r border-slate-200 h-full flex flex-col z-10 shadow-sm">
      <div className="flex border-b border-slate-200">
        <button 
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 ${activeTab === 'library' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
          onClick={() => setActiveTab('library')}
        >
          <Library size={14} /> Tools
        </button>
        <button 
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 ${activeTab === 'unplaced' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
          onClick={() => setActiveTab('unplaced')}
        >
          <MapPin size={14} /> Unplaced
          {(unplacedBuildings.length + unplacedObjects.length) > 0 && (
            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-[10px] leading-none">
              {unplacedBuildings.length + unplacedObjects.length}
            </span>
          )}
        </button>
      </div>

      <div className="p-4 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-300" /></div>
        ) : activeTab === 'library' ? (
          filteredTypes.length === 0 ? (
            <div className="text-center p-4 text-sm text-slate-500">No objects found.</div>
          ) : (
            filteredTypes.map(type => {
              const IconComp = (icons as any)[type.iconName] || icons.Box;
              const isActive = activeTypeId === type.id;
              
              return (
                <button
                  key={type.id}
                  onClick={() => onSelectType(type)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                    isActive ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div 
                    className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${type.color}15`, color: type.color }}
                  >
                    <IconComp size={16} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-blue-900' : 'text-slate-900'}`}>
                      {type.name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">
                      {type.category}
                    </p>
                  </div>
                </button>
              );
            })
          )
        ) : (
          /* Unplaced Tab */
          <>
            {campusId && !floorId && filteredBuildings.length === 0 && (
              <div className="text-center p-4 text-sm text-slate-500">All buildings placed!</div>
            )}
            {floorId && filteredObjects.length === 0 && (
              <div className="text-center p-4 text-sm text-slate-500">All objects placed!</div>
            )}

            {campusId && !floorId && filteredBuildings.map(b => (
              <button
                key={b.id}
                onClick={() => onSelectUnplaced?.({ id: b.id, name: b.name.en, category: 'building', type: 'building' })}
                className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-slate-50 border border-transparent transition-colors"
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
                  <icons.Building2 size={16} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-slate-900 truncate">{b.name.en}</p>
                  <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">Building</p>
                </div>
              </button>
            ))}

            {floorId && filteredObjects.map(o => (
              <button
                key={o.id}
                onClick={() => onSelectUnplaced?.({ id: o.id, name: o.name.en as string, category: o.category, type: 'object' })}
                className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-slate-50 border border-transparent transition-colors"
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600">
                  <icons.Box size={16} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-slate-900 truncate">{o.name.en as string}</p>
                  <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{o.category}</p>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
