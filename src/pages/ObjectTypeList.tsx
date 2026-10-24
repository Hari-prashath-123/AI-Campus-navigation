import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Shield, Edit2, Trash2, ArrowRight, Type } from 'lucide-react';
import * as icons from 'lucide-react';
import { objectTypeService } from '../api/object-type.service';
import { ObjectType, OBJECT_CATEGORIES } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';

export const ObjectTypeList: React.FC = () => {
  const [types, setTypes] = useState<ObjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<ObjectType | null>(null);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const res = await objectTypeService.getAll();
      if (res.success) {
        setTypes(res.data);
      } else {
        setError(res.message || 'Failed to load object types.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setLoading(true);
      await objectTypeService.delete(deleteConfirm.id);
      setTypes(types.filter(t => t.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete object type.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTypes = types.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && types.length === 0) return <LoadingState text="Loading object types..." />;
  if (error) return <ErrorState title="Error Loading Types" message={error} onRetry={loadTypes} />;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-outfit font-bold text-slate-900 tracking-tight">Object Types</h1>
            <p className="text-slate-500 mt-1">Manage the domain models for spaces and amenities across all campuses.</p>
          </div>
          <Link to="/admin/object-types/new">
            <Button variant="primary" icon={<Plus size={18} />}>
              Create Type
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="mt-6 flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by name or slug..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" icon={<Filter size={18} />}>
            Filters
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {filteredTypes.length === 0 ? (
          <EmptyState 
            title="No Object Types Found" 
            message={search ? "No types match your search criteria." : "Get started by creating your first object type."}
            icon={<Type size={48} />}
            action={!search ? { label: 'Create Type', onClick: () => window.location.href = '/admin/object-types/new' } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTypes.map(type => {
              const IconComponent = (icons as any)[type.iconName] || icons.Box;
              const category = OBJECT_CATEGORIES.find(c => c.value === type.category);

              return (
                <div key={type.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-opacity-10" style={{ backgroundColor: `${type.color}15`, color: type.color }}>
                        <IconComponent size={24} />
                      </div>
                      <div>
                        <h3 className="font-outfit font-semibold text-lg text-slate-900 leading-tight">
                          {type.name}
                        </h3>
                        <p className="text-sm text-slate-500 font-mono mt-0.5">/{type.slug}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col gap-4">
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {type.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mt-auto">
                      <Badge variant="neutral">{category?.label || type.category}</Badge>
                      {type.isSystem && (
                        <Badge variant="primary" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                          <Shield size={12} /> System
                        </Badge>
                      )}
                      <Badge variant="neutral">{type.propertyDefinitions.length} Properties</Badge>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/80 rounded-b-xl border-t border-slate-100 flex items-center justify-between transition-colors group-hover:bg-blue-50/30">
                    <div className="flex gap-1">
                      <Link to={`/admin/object-types/${type.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600 hover:text-blue-600">
                          <Edit2 size={16} />
                        </Button>
                      </Link>
                      {!type.isSystem && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-slate-600 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteConfirm(type)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                    <Link to={`/admin/object-types/${type.id}`} className="text-sm font-medium text-blue-600 flex items-center gap-1 hover:text-blue-700 pr-2">
                      Configure <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Object Type"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Are you sure you want to delete the <strong>{deleteConfirm?.name}</strong> object type? 
            This action cannot be undone and may break existing objects of this type on your campuses.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={loading}>Delete Object Type</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
