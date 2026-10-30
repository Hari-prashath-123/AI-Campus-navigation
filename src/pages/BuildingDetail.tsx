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
import { Layers, Plus, Edit2, Map, Copy, Box } from 'lucide-react';

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

      if (floorsRes.success) setFloors(floorsRes.data);
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
                      <Link to={`/admin/campuses/${campus.id}/buildings/${building.id}/floors/${floor.id}/objects`}>
                        <Button variant="outline" size="sm" icon={<Box size={14} />} className="opacity-0 group-hover:opacity-100 transition-opacity">Objects</Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-slate-500 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
    </div>
  );
};
