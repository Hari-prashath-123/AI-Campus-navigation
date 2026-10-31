import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { campusService } from '../api/campus.service';
import { Campus, Building, Floor } from '../types';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Layers, Plus, Edit2, Map, Copy, DoorOpen, Search, Trash2 } from 'lucide-react';
import { objectService } from '../api/object.service';
import { MapObject } from '../types';

const isRealRoom = (o: MapObject) => {
  const cat = (o.category || '').toLowerCase();
  const typeId = (o.objectTypeId || '').toLowerCase();
  const name = (typeof o.name === 'string' ? o.name : o.name?.en || '').toLowerCase();
  if (['transit', 'navigation_path', 'outdoor', 'path'].includes(cat)) return false;
  if (['navigation_path', 'navpath', 'hallway', 'corridor', 'pathway', 'walkway'].some(t => typeId.includes(t))) return false;
  if (['navigation_path', 'navpath', 'hallway', 'corridor', 'pathway', 'walkway', 'straight road', 'curved 90'].some(t => name.startsWith(t) || name.includes(t))) return false;
  return true;
};

export const BuildingDetail: React.FC = () => {
  const { campusId, buildingId } = useParams<{ campusId: string; buildingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const promptPlacement = location.state?.promptPlacement;

  const [campus, setCampus] = useState<Campus | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreatingFloor, setIsCreatingFloor] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');
  const [newFloorLevel, setNewFloorLevel] = useState<number>(0);
  const [newFloorWidthM, setNewFloorWidthM] = useState(100);
  const [newFloorHeightM, setNewFloorHeightM] = useState(60);
  const [newFloorCode, setNewFloorCode] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [duplicateConfirm, setDuplicateConfirm] = useState<Floor | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateLevel, setDuplicateLevel] = useState(0);

  // Floor Rooms management state
  const [floorRooms, setFloorRooms] = useState<Record<string, MapObject[]>>({});
  const [selectedFloorForRooms, setSelectedFloorForRooms] = useState<Floor | null>(null);
  const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);
  const [roomFilterSearch, setRoomFilterSearch] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCode, setNewRoomCode] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState('office');
  const [creatingRoom, setCreatingRoom] = useState(false);

  useEffect(() => {
    if (campusId && buildingId) {
      loadData(campusId, buildingId);
    }
  }, [campusId, buildingId]);

  const loadData = async (cId: string, bId: string) => {
    try {
      setLoading(true);
      const [campusRes, buildingRes, floorsRes] = await Promise.all([
        campusService.getCampusById(cId),
        campusService.getBuildingById(bId),
        campusService.getFloorsByBuilding(bId)
      ]);

      if (campusRes.success && campusRes.data) setCampus(campusRes.data);
      else setError('Campus not found.');

      if (buildingRes.success && buildingRes.data) setBuilding(buildingRes.data);
      else setError('Building not found.');

      if (floorsRes.success) {
        setFloors(floorsRes.data);
        // Load objects for each floor
        const roomsMap: Record<string, MapObject[]> = {};
        await Promise.all(
          floorsRes.data.map(async f => {
            const oRes = await objectService.getObjectsByFloor(f.id);
            if (oRes.success) roomsMap[f.id] = oRes.data.filter(isRealRoom);
          })
        );
        setFloorRooms(roomsMap);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFloor = async () => {
    if (!newFloorName.trim() || !campus || !building) return;
    try {
      setSaving(true);
      const res = await campusService.createFloor({ 
        campusId: campus.id,
        buildingId: building.id,
        name: { en: newFloorName },
        level: newFloorLevel,
        code: newFloorCode.trim() || undefined,
        dimensions: { widthMeters: newFloorWidthM, heightMeters: newFloorHeightM },
      });
      if (res.success && res.data) {
        setIsCreatingFloor(false);
        setNewFloorName('');
        setNewFloorCode('');
        setNewFloorWidthM(100);
        setNewFloorHeightM(60);
        navigate(`/admin/campuses/${campus.id}/buildings/${building.id}/floors/${res.data.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRoomsModal = async (flr: Floor) => {
    setSelectedFloorForRooms(flr);
    setRoomFilterSearch('');
    setIsRoomsModalOpen(true);
    const oRes = await objectService.getObjectsByFloor(flr.id);
    if (oRes.success) {
      setFloorRooms(prev => ({ ...prev, [flr.id]: oRes.data.filter(isRealRoom) }));
    }
  };

  const handleCreateRoomForFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFloorForRooms || !newRoomName.trim() || !campus || !building) return;
    setCreatingRoom(true);
    try {
      const code = newRoomCode.trim() || newRoomName.trim().toUpperCase().replace(/\s+/g, '-').slice(0, 10);
      const res = await objectService.createObject({
        campusId: campus.id,
        buildingId: building.id,
        floorId: selectedFloorForRooms.id,
        code,
        name: { en: newRoomName.trim() },
        category: newRoomCategory,
        coordinates: { x: 0, y: 0 },
        associatedNodeId: '',
        isAccessible: true,
      });
      if (res.success && res.data) {
        setFloorRooms(prev => ({
          ...prev,
          [selectedFloorForRooms.id]: [...(prev[selectedFloorForRooms.id] || []), res.data]
        }));
        setNewRoomName('');
        setNewRoomCode('');
      }
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!selectedFloorForRooms) return;
    const res = await objectService.deleteObject(roomId);
    if (res.success) {
      setFloorRooms(prev => ({
        ...prev,
        [selectedFloorForRooms.id]: (prev[selectedFloorForRooms.id] || []).filter(r => r.id !== roomId)
      }));
    }
  };

  const handleDuplicateFloor = async () => {
    if (!duplicateConfirm || !duplicateName.trim() || !campus || !building) return;
    try {
      setSaving(true);
      const res = await campusService.duplicateFloor(
        duplicateConfirm.id,
        duplicateLevel,
        { en: duplicateName },
        true
      );
      if (res.success && res.data) {
        setDuplicateConfirm(null);
        setDuplicateName('');
        loadData(campus.id, building.id);
      } else {
        alert(res.message || 'Failed to duplicate floor.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState text="Loading building data..." />;
  if (error || !campus || !building) return <ErrorState title="Error" message={error || 'Not found'} />;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <Breadcrumbs items={[
        { label: 'Campuses', path: '/admin/campuses' },
        { label: campus.name.en || campus.code, path: `/admin/campuses/${campus.id}` },
        { label: building.name.en || building.code }
      ]} />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-outfit font-bold text-slate-900">{building.name.en}</h1>
                <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                  {building.code}
                </span>
              </div>
              <p className="text-slate-600 mt-4 max-w-3xl">{building.description?.en || 'No description provided.'}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" icon={<Edit2 size={18} />}>Edit Building</Button>
            </div>
          </div>

          {promptPlacement && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <Map className="text-blue-600" size={20} />
                </div>
                <div>
                  <h3 className="text-blue-800 font-semibold">Place Building on Campus Map</h3>
                  <p className="text-blue-700/80 text-sm mt-0.5">
                    Building created successfully! Now, please open the Campus Map to draw the outline of this building and connect it with paths.
                  </p>
                </div>
              </div>
              <Link to={`/admin/campuses/${campus.id}/map`} className="shrink-0">
                <Button variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white border-transparent">
                  Open Campus Map
                </Button>
              </Link>
            </div>
          )}

          {/* Floors List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-outfit font-bold text-slate-900">Floors</h2>
              <Button variant="primary" icon={<Plus size={18} />} onClick={() => setIsCreatingFloor(true)}>
                Add Floor
              </Button>
            </div>

            {floors.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <EmptyState 
                  title="No Floors" 
                  message="Add your first floor to this building."
                  icon={<Layers size={48} />}
                  action={{ label: 'Add Floor', onClick: () => setIsCreatingFloor(true) }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {floors.map(floor => (
                  <div key={floor.id} className="group bg-white rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-all p-4 flex items-center justify-between">
                    <Link to={`/admin/campuses/${campus.id}/buildings/${building.id}/floors/${floor.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold font-mono shrink-0">
                        L{floor.level}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-outfit font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {floor.name.en}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Code: {floor.code} • Dims: {floor.dimensions.widthMeters}×{floor.dimensions.heightMeters}m
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Visible Rooms Button next to Map Editor */}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        icon={<DoorOpen size={14} className="text-blue-600" />}
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenRoomsModal(floor);
                        }}
                        className="border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100/70 font-semibold shadow-xs"
                      >
                        Rooms ({floorRooms[floor.id]?.length || 0})
                      </Button>

                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-slate-500 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Duplicate floor"
                        onClick={(e) => {
                          e.preventDefault();
                          setDuplicateConfirm(floor);
                          setDuplicateName(`${floor.name.en} (Copy)`);
                          setDuplicateLevel(floor.level + 1);
                        }}
                      >
                        <Copy size={16} />
                      </Button>
                      
                      <Link to={`/admin/campuses/${campus.id}/buildings/${building.id}/floors/${floor.id}`}>
                        <Button variant="outline" size="sm" icon={<Map size={14} />}>Map Editor</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isCreatingFloor} onClose={() => setIsCreatingFloor(false)} title="Create New Floor">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input 
              label="Floor Name (English)" 
              placeholder="e.g. Ground Floor" 
              value={newFloorName}
              onChange={e => setNewFloorName(e.target.value)}
              autoFocus
            />
            <Input
              label="Short Code (optional)"
              placeholder="e.g. G-FLR"
              value={newFloorCode}
              onChange={e => setNewFloorCode(e.target.value.toUpperCase())}
            />
          </div>
          <Input 
            label="Level Number" 
            type="number"
            placeholder="0 = Ground, 1 = First, -1 = Basement" 
            value={newFloorLevel}
            onChange={e => setNewFloorLevel(parseInt(e.target.value) || 0)}
            helperText="0 = Ground Floor, positive = upper, negative = basement"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Floor Dimensions</label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Width (meters)"
                type="number"
                value={newFloorWidthM}
                onChange={e => setNewFloorWidthM(parseFloat(e.target.value) || 100)}
              />
              <Input
                label="Height (meters)"
                type="number"
                value={newFloorHeightM}
                onChange={e => setNewFloorHeightM(parseFloat(e.target.value) || 60)}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">These define the canvas scale in the map editor.</p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCreatingFloor(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateFloor} isLoading={saving} disabled={!newFloorName.trim()}>Create Floor</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!duplicateConfirm} onClose={() => setDuplicateConfirm(null)} title="Duplicate Floor">
        <div className="space-y-4">
          <Input 
            label="New Floor Name (English)" 
            value={duplicateName}
            onChange={e => setDuplicateName(e.target.value)}
            autoFocus
          />
          <Input 
            label="New Level" 
            type="number"
            value={duplicateLevel}
            onChange={e => setDuplicateLevel(parseInt(e.target.value))}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setDuplicateConfirm(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleDuplicateFloor} isLoading={saving} disabled={!duplicateName.trim()}>Duplicate Floor</Button>
          </div>
        </div>
      </Modal>

      {/* Rooms Management Modal with Add Room & Room Interior Map Editor buttons */}
      <Modal
        isOpen={isRoomsModalOpen}
        onClose={() => setIsRoomsModalOpen(false)}
        title={`Rooms on Level ${selectedFloorForRooms?.level ?? 0} — ${selectedFloorForRooms?.name.en || 'Floor'}`}
        size="lg"
      >
        <div className="space-y-5">
          {/* Header Description */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
            Declare rooms for this floor. Added rooms appear in the <strong>Unplaced</strong> section of the Floor Map Editor, and you can click <strong>Map Editor</strong> on any room to customize its interior cabins, staff desks, and walkways.
          </div>

          {/* Declare New Room Form */}
          <form onSubmit={handleCreateRoomForFloor} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Plus size={14} className="text-blue-600" />
              <span>Declare New Room on Floor</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Room Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Staff Room, HOD Cabin"
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Room Code</label>
                <input
                  type="text"
                  placeholder="e.g. SR-01"
                  value={newRoomCode}
                  onChange={e => setNewRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={newRoomCategory}
                  onChange={e => setNewRoomCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="office">Staff Room / Office</option>
                  <option value="classroom">Classroom</option>
                  <option value="laboratory">Laboratory</option>
                  <option value="amenity">Restroom / Amenity</option>
                  <option value="cafeteria">Cafeteria / Canteen</option>
                  <option value="auditorium">Auditorium</option>
                  <option value="conference">Conference Room</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={creatingRoom || !newRoomName.trim()}
                icon={<Plus size={14} />}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {creatingRoom ? 'Adding Room...' : '+ Add Room to Floor'}
              </Button>
            </div>
          </form>

          {/* Rooms List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Floor Rooms ({(selectedFloorForRooms && floorRooms[selectedFloorForRooms.id]?.length) || 0})
              </h4>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input
                  type="text"
                  placeholder="Filter rooms..."
                  value={roomFilterSearch}
                  onChange={e => setRoomFilterSearch(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {selectedFloorForRooms && (floorRooms[selectedFloorForRooms.id]?.length || 0) === 0 ? (
              <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                No rooms declared on this floor yet. Use the form above to declare your first room.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {selectedFloorForRooms && (floorRooms[selectedFloorForRooms.id] || [])
                  .filter(r => {
                    if (!isRealRoom(r)) return false;
                    const name = typeof r.name === 'string' ? r.name : r.name.en;
                    return name.toLowerCase().includes(roomFilterSearch.toLowerCase()) || r.code.toLowerCase().includes(roomFilterSearch.toLowerCase());
                  })
                  .map(room => {
                    const rName = typeof room.name === 'string' ? room.name : room.name.en;
                    return (
                      <div key={room.id} className="p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 shadow-2xs flex items-center justify-between gap-3 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <DoorOpen size={16} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-semibold text-slate-900 text-xs truncate">{rName}</h5>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>Code: {room.code}</span>
                              <span>•</span>
                              <span className="capitalize px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">{room.category}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Dedicated Map Editor button for this Room's Interior */}
                          <Link to={`/admin/campuses/${campus?.id}/buildings/${building?.id}/floors/${selectedFloorForRooms.id}?roomId=${room.id}`}>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              icon={<Map size={13} />}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                            >
                              Map Editor
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-red-600"
                            onClick={() => handleDeleteRoom(room.id)}
                            title="Delete Room"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
