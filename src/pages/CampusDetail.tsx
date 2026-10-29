import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { campusService } from '../api/campus.service';
import { Campus, Building } from '../types';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Map, Building2, Plus, Edit2, Network, FileJson, Trash2, Copy } from 'lucide-react';

export const CampusDetail: React.FC = () => {
  const { campusId } = useParams<{ campusId: string }>();
  const navigate = useNavigate();

  const [campus, setCampus] = useState<Campus | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreatingBuilding, setIsCreatingBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasMapData, setHasMapData] = useState(true);
  
  const [deleteConfirm, setDeleteConfirm] = useState<Building | null>(null);
  const [duplicateConfirm, setDuplicateConfirm] = useState<Building | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  useEffect(() => {
    if (campusId) {
      loadData(campusId);
    }
  }, [campusId]);

  useEffect(() => {
    if (campus) {
      const key = `editor-shapes-${campus.id}--`;
      const data = localStorage.getItem(key);
      let hasData = false;
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.length > 0) hasData = true;
        } catch (e) {}
      }
      setHasMapData(hasData);
    }
  }, [campus]);

  const loadData = async (id: string) => {
    try {
      setLoading(true);
      const [campusRes, buildingsRes] = await Promise.all([
        campusService.getCampusById(id),
        campusService.getBuildingsByCampus(id)
      ]);

      if (campusRes.success && campusRes.data) setCampus(campusRes.data);
      else setError('Campus not found.');

      if (buildingsRes.success) setBuildings(buildingsRes.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBuilding = async () => {
    if (!newBuildingName.trim() || !campus) return;
    try {
      setSaving(true);
      const res = await campusService.createBuilding({ 
        campusId: campus.id, 
        name: { en: newBuildingName } 
      });
      if (res.success && res.data) {
        setIsCreatingBuilding(false);
        setNewBuildingName('');
        navigate(`/admin/campuses/${campus.id}/buildings/${res.data.id}`, { state: { promptPlacement: true } });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBuilding = async () => {
    if (!deleteConfirm) return;
    try {
      setSaving(true);
      await campusService.deleteBuilding(deleteConfirm.id);
      setDeleteConfirm(null);
      if (campusId) loadData(campusId);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateBuilding = async () => {
    if (!duplicateConfirm || !duplicateName.trim() || !campus) return;
    try {
      setSaving(true);
      // Create a new building based on the old one
      const res = await campusService.createBuilding({
        campusId: campus.id,
        name: { en: duplicateName },
        // Would also copy floors and properties here if the API supported it in a single call
        // For now we just create a new building with the duplicated name
      });
      if (res.success && res.data) {
        setDuplicateConfirm(null);
        setDuplicateName('');
        if (campusId) loadData(campusId);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState text="Loading campus data..." />;
  if (error || !campus) return <ErrorState title="Error" message={error || 'Not found'} />;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <Breadcrumbs items={[
        { label: 'Campuses', path: '/admin/campuses' },
        { label: campus.name.en || campus.code }
      ]} />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-outfit font-bold text-slate-900">{campus.name.en}</h1>
              <p className="text-sm text-slate-500 font-mono mt-1">CODE: {campus.code}</p>
              <p className="text-slate-600 mt-4 max-w-3xl">{campus.description?.en || 'No description provided.'}</p>
            </div>
            <div className="flex gap-2">
              <Link to={`/admin/campuses/${campus.id}/connections`}>
                <Button variant="outline" icon={<Network size={18} />}>Routing &amp; Connections</Button>
              </Link>
              <Link to={`/admin/campuses/${campus.id}/map`}>
                <Button variant="outline" icon={<Map size={18} />}>Campus Map</Button>
              </Link>
              <Link to={`/admin/campuses/${campus.id}/import-export`}>
                <Button variant="outline" icon={<FileJson size={18} />}>Import / Export</Button>
              </Link>
              <Button variant="outline" icon={<Edit2 size={18} />}>Edit</Button>
            </div>
          </div>

          {!hasMapData && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                  <Map className="text-amber-600" size={20} />
                </div>
                <div>
                  <h3 className="text-amber-800 font-semibold">Campus map not configured</h3>
                  <p className="text-amber-700/80 text-sm mt-0.5">
                    You haven't defined the geographical outline of this campus yet. Please go to the map editor to draw the campus boundary and place its buildings.
                  </p>
                </div>
              </div>
              <Link to={`/admin/campuses/${campus.id}/map`} className="shrink-0">
                <Button variant="primary" className="bg-amber-600 hover:bg-amber-700 text-white border-transparent">
                  Open Map Editor
                </Button>
              </Link>
            </div>
          )}

          {/* Buildings List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-outfit font-bold text-slate-900">Buildings</h2>
              <Button variant="primary" icon={<Plus size={18} />} onClick={() => setIsCreatingBuilding(true)}>
                Add Building
              </Button>
            </div>

            {buildings.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <EmptyState 
                  title="No Buildings" 
                  message="Add your first building to this campus."
                  icon={<Building2 size={48} />}
                  action={{ label: 'Add Building', onClick: () => setIsCreatingBuilding(true) }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buildings.map(bld => (
                  <div key={bld.id} className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all flex flex-col h-full overflow-hidden">
                    <Link to={`/admin/campuses/${campus.id}/buildings/${bld.id}`} className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Building2 size={24} />
                        </div>
                        <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                          {bld.code}
                        </span>
                      </div>
                      <h3 className="font-outfit font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                        {bld.name.en}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1 flex-1">
                        {bld.totalFloors} Floor{bld.totalFloors !== 1 && 's'}
                      </p>
                    </Link>
                    
                    {/* Action Bar */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 text-slate-600 hover:text-blue-600"
                        onClick={(e) => { e.preventDefault(); setDuplicateConfirm(bld); setDuplicateName(`${bld.name.en} (Copy)`); }}
                      >
                        <Copy size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 text-slate-600 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => { e.preventDefault(); setDeleteConfirm(bld); }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isCreatingBuilding} onClose={() => setIsCreatingBuilding(false)} title="Create New Building">
        <div className="space-y-4">
          <Input 
            label="Building Name (English)" 
            placeholder="e.g. Science Block A" 
            value={newBuildingName}
            onChange={e => setNewBuildingName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCreatingBuilding(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateBuilding} isLoading={saving} disabled={!newBuildingName.trim()}>Create Building</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Building">
        <div className="space-y-4">
          <p className="text-slate-600">
            Are you sure you want to delete the building <strong>{deleteConfirm?.name.en}</strong>? This action cannot be undone and will delete all associated floors and objects.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteBuilding} isLoading={saving}>Delete Building</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!duplicateConfirm} onClose={() => setDuplicateConfirm(null)} title="Duplicate Building">
        <div className="space-y-4">
          <Input 
            label="New Building Name" 
            value={duplicateName}
            onChange={e => setDuplicateName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setDuplicateConfirm(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleDuplicateBuilding} isLoading={saving} disabled={!duplicateName.trim()}>Duplicate</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
