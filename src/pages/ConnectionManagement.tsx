import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { connectionService } from '../api/connection.service';
import { campusService } from '../api/campus.service';
import { CampusConnection, Campus, Building, Floor } from '../types';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Network, Plus, Trash2, ArrowRightLeft, ArrowRight } from 'lucide-react';

export const ConnectionManagement: React.FC = () => {
  const { campusId } = useParams<{ campusId: string }>();

  const [campus, setCampus] = useState<Campus | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [connections, setConnections] = useState<CampusConnection[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<CampusConnection>>({
    connectionType: 'staircase',
    isBidirectional: true,
    isAccessible: false,
    isWalkable: true,
    isVehicleAccessible: false,
  });

  useEffect(() => {
    if (campusId) loadData(campusId);
  }, [campusId]);

  const loadData = async (cId: string) => {
    try {
      setLoading(true);
      const [campusRes, bldRes, connRes] = await Promise.all([
        campusService.getCampusById(cId),
        campusService.getBuildingsByCampus(cId),
        connectionService.getConnectionsByCampus(cId)
      ]);

      if (campusRes.success && campusRes.data) setCampus(campusRes.data);
      else setError('Campus not found.');

      if (bldRes.success) {
        setBuildings(bldRes.data);
        // Load all floors for all buildings for the dropdowns
        const allFloors: Floor[] = [];
        for (const b of bldRes.data) {
          const fRes = await campusService.getFloorsByBuilding(b.id);
          if (fRes.success) allFloors.push(...fRes.data);
        }
        setFloors(allFloors);
      }
      
      if (connRes.success) setConnections(connRes.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!campus) return;
    try {
      setSaving(true);
      const res = await connectionService.createConnection({
        ...draft,
        campusId: campus.id,
        // Using mock nodes for MVP if not selected
        sourceNodeId: draft.sourceNodeId || 'node-a',
        targetNodeId: draft.targetNodeId || 'node-b',
      });
      if (res.success && res.data) {
        setConnections([...connections, res.data]);
        setIsCreating(false);
        setDraft({ connectionType: 'staircase', isBidirectional: true, isAccessible: false, isWalkable: true });
      } else {
        alert(res.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this connection?')) {
      await connectionService.deleteConnection(id);
      setConnections(connections.filter(c => c.id !== id));
    }
  };

  const getEntityName = (bId?: string, fId?: string) => {
    if (!bId && !fId) return 'Campus Level';
    const b = buildings.find(b => b.id === bId);
    const f = floors.find(f => f.id === fId);
    return `${b?.name.en || 'Unknown Bldg'} ${f ? `(Level ${f.level})` : ''}`;
  };

  const validateConnection = (): string | null => {
    if (!draft.name) return "Name is required.";
    if (!draft.sourceBuildingId && draft.sourceFloorId) return "Source floor requires building.";
    if (!draft.targetBuildingId && draft.targetFloorId) return "Target floor requires building.";
    if (draft.sourceBuildingId === draft.targetBuildingId && draft.sourceFloorId === draft.targetFloorId) {
      if (['staircase', 'elevator'].includes(draft.connectionType || '')) {
        return "Stairs and elevators must connect different floors.";
      }
    }
    return null;
  };

  const validationError = validateConnection();

  if (loading) return <LoadingState text="Loading connections..." />;
  if (error || !campus) return <ErrorState title="Error" message={error || 'Not found'} />;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <Breadcrumbs items={[
        { label: 'Campuses', path: '/admin/campuses' },
        { label: campus.name.en || campus.code, path: `/admin/campuses/${campus.id}` },
        { label: 'Connections' }
      ]} />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-outfit font-bold text-slate-900 flex items-center gap-2">
                <Network className="text-blue-600" /> Connection Routing
              </h1>
              <p className="text-slate-500 mt-1">Manage stairs, elevators, bridges, and cross-building paths.</p>
            </div>
            <Button variant="primary" icon={<Plus size={18} />} onClick={() => setIsCreating(true)}>
              New Connection
            </Button>
          </div>

          {connections.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <EmptyState 
                title="No Connections" 
                message="Create connections between floors and buildings for routing."
                icon={<Network size={48} />}
                action={{ label: 'New Connection', onClick: () => setIsCreating(true) }}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Name / Type</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4 text-center">Dir</th>
                    <th className="px-6 py-4">Target</th>
                    <th className="px-6 py-4">Attributes</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {connections.map(conn => (
                    <tr key={conn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{conn.name}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">{conn.connectionType.replace('_', ' ')}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {getEntityName(conn.sourceBuildingId, conn.sourceFloorId)}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-400">
                        {conn.isBidirectional ? <ArrowRightLeft size={16} className="mx-auto" /> : <ArrowRight size={16} className="mx-auto text-blue-500" />}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {getEntityName(conn.targetBuildingId, conn.targetFloorId)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {conn.isAccessible && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">Accessible</span>}
                          {conn.isWalkable && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Walkable</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDelete(conn.id)} className="text-slate-400 hover:text-red-600 p-2">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isCreating} onClose={() => setIsCreating(false)} title="Create Connection">
        <div className="space-y-6">
          <Input 
            label="Connection Name" 
            placeholder="e.g. Main Elevator Bank" 
            value={draft.name || ''}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
          />

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Connection Type</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={draft.connectionType}
              onChange={e => setDraft({ ...draft, connectionType: e.target.value as any })}
            >
              <option value="staircase">Staircase</option>
              <option value="elevator">Elevator</option>
              <option value="ramp">Ramp</option>
              <option value="bridge">Bridge</option>
              <option value="door">Door</option>
              <option value="corridor">Corridor</option>
              <option value="building_to_building">Building-to-Building</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            {/* Source */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Source</h4>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Building (Optional)</label>
                <select className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  value={draft.sourceBuildingId || ''}
                  onChange={e => setDraft({ ...draft, sourceBuildingId: e.target.value || undefined, sourceFloorId: undefined })}
                >
                  <option value="">Campus Level</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name.en}</option>)}
                </select>
              </div>
              {draft.sourceBuildingId && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Floor</label>
                  <select className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white"
                    value={draft.sourceFloorId || ''}
                    onChange={e => setDraft({ ...draft, sourceFloorId: e.target.value || undefined })}
                  >
                    <option value="">Select Floor</option>
                    {floors.filter(f => f.buildingId === draft.sourceBuildingId).map(f => (
                      <option key={f.id} value={f.id}>Level {f.level} - {f.name.en}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Target */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Target</h4>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Building (Optional)</label>
                <select className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  value={draft.targetBuildingId || ''}
                  onChange={e => setDraft({ ...draft, targetBuildingId: e.target.value || undefined, targetFloorId: undefined })}
                >
                  <option value="">Campus Level</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name.en}</option>)}
                </select>
              </div>
              {draft.targetBuildingId && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Floor</label>
                  <select className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white"
                    value={draft.targetFloorId || ''}
                    onChange={e => setDraft({ ...draft, targetFloorId: e.target.value || undefined })}
                  >
                    <option value="">Select Floor</option>
                    {floors.filter(f => f.buildingId === draft.targetBuildingId).map(f => (
                      <option key={f.id} value={f.id}>Level {f.level} - {f.name.en}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Attributes</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={draft.isBidirectional} onChange={e => setDraft({...draft, isBidirectional: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                Bidirectional (↔)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={draft.isAccessible} onChange={e => setDraft({...draft, isAccessible: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                Wheelchair Accessible
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={draft.isWalkable} onChange={e => setDraft({...draft, isWalkable: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                Walkable
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={draft.isVehicleAccessible} onChange={e => setDraft({...draft, isVehicleAccessible: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                Vehicle Accessible
              </label>
            </div>
          </div>
          
          {validationError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
              {validationError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} isLoading={saving} disabled={!!validationError}>Create Connection</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
