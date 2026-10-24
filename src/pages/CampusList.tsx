import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Map as MapIcon, Building2, ArrowRight } from 'lucide-react';
import { campusService } from '../api/campus.service';
import { Campus } from '../types';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

export const CampusList: React.FC = () => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [isCreating, setIsCreating] = useState(false);
  const [newCampusName, setNewCampusName] = useState('');
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadCampuses();
  }, []);

  const loadCampuses = async () => {
    try {
      setLoading(true);
      const res = await campusService.getCampuses();
      if (res.success) setCampuses(res.data);
      else setError('Failed to load campuses.');
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCampusName.trim()) return;
    try {
      setSaving(true);
      const res = await campusService.createCampus({ name: { en: newCampusName } });
      if (res.success && res.data) {
        setIsCreating(false);
        navigate(`/admin/campuses/${res.data.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = campuses.filter(c => 
    c.name.en?.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && campuses.length === 0) return <LoadingState text="Loading campuses..." />;
  if (error) return <ErrorState title="Error Loading Campuses" message={error} onRetry={loadCampuses} />;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-outfit font-bold text-slate-900 tracking-tight">Campuses</h1>
            <p className="text-slate-500 mt-1">Manage multiple geographically isolated campus locations.</p>
          </div>
          <Button variant="primary" icon={<Plus size={18} />} onClick={() => setIsCreating(true)}>
            Add Campus
          </Button>
        </div>

        <div className="mt-6 flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search campuses..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {filtered.length === 0 ? (
          <EmptyState 
            title="No Campuses Found" 
            message="Create a campus to start defining buildings and floors."
            icon={<MapIcon size={48} />}
            action={{ label: 'Add Campus', onClick: () => setIsCreating(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(campus => (
              <Link key={campus.id} to={`/admin/campuses/${campus.id}`} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col h-full overflow-hidden">
                <div className="h-32 bg-slate-100 relative">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md text-xs font-bold text-slate-700 shadow-sm border border-white/50">
                    {campus.code}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-outfit font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                    {campus.name.en}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                    {campus.description?.en || 'No description provided.'}
                  </p>
                  
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-slate-400 text-sm">
                      <Building2 size={16} />
                      <span>Manage buildings & floors</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isCreating} onClose={() => setIsCreating(false)} title="Create New Campus">
        <div className="space-y-4">
          <Input 
            label="Campus Name (English)" 
            placeholder="e.g. Main City Campus" 
            value={newCampusName}
            onChange={e => setNewCampusName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} isLoading={saving} disabled={!newCampusName.trim()}>Create Campus</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
