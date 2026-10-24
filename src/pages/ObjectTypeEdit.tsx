import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Layers } from 'lucide-react';
import { objectTypeService } from '../api/object-type.service';
import { ObjectType, ObjectTypeFormData } from '../types';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { Badge } from '../components/ui/Badge';
import { ObjectTypeForm } from '../components/ObjectTypeForm';
import { PropertyDefinitionEditor } from '../components/PropertyDefinitionEditor';
import { PreviewObjectForm } from '../components/PreviewObjectForm';

export const ObjectTypeEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [originalType, setOriginalType] = useState<ObjectType | null>(null);
  const [formData, setFormData] = useState<ObjectTypeFormData>({
    slug: '',
    name: '',
    description: '',
    category: 'room',
    iconName: 'Box',
    color: '#3b82f6',
    isNavigable: true,
    isBarrier: false,
    isConnector: false,
    propertyDefinitions: []
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'properties' | 'preview'>('basic');

  useEffect(() => {
    if (id) {
      loadType(id);
    }
  }, [id]);

  const loadType = async (typeId: string) => {
    try {
      setLoading(true);
      const res = await objectTypeService.getById(typeId);
      if (res.success) {
        setOriginalType(res.data);
        setFormData({
          slug: res.data.slug,
          name: res.data.name,
          description: res.data.description,
          category: res.data.category,
          iconName: res.data.iconName,
          color: res.data.color,
          isNavigable: res.data.isNavigable,
          isBarrier: res.data.isBarrier,
          isConnector: res.data.isConnector,
          propertyDefinitions: [...res.data.propertyDefinitions]
        });
      } else {
        setError(res.message || 'Failed to load object type.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      if (isNew) {
        const res = await objectTypeService.create(formData);
        if (res.success) navigate('/admin/object-types');
        else setError(res.message || 'Failed to create');
      } else {
        if (originalType?.isSystem) {
          // System types only update properties
          const res = await objectTypeService.updateSystemProperties(id!, formData.propertyDefinitions);
          if (res.success) navigate('/admin/object-types');
          else setError(res.message || 'Failed to update system properties');
        } else {
          const res = await objectTypeService.update(id!, formData);
          if (res.success) navigate('/admin/object-types');
          else setError(res.message || 'Failed to update');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Validation failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState text="Loading object type details..." />;
  if (error && !formData.name && !isNew) return <ErrorState title="Error" message={error} onRetry={() => loadType(id!)} />;

  const isSystem = originalType?.isSystem;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link to="/admin/object-types" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-outfit font-bold text-slate-900 tracking-tight">
                {isNew ? 'Create Object Type' : `Edit ${originalType?.name}`}
              </h1>
              {isSystem && <Badge variant="primary">System Type</Badge>}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {isSystem 
                ? 'Basic settings are locked for system types. You can only edit properties.' 
                : 'Configure how this entity behaves and what data it collects.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link to="/admin/object-types">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button variant="primary" icon={<Save size={18} />} onClick={handleSave} isLoading={saving}>
            Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="px-8 mt-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Content Tabs */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <div className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'basic' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Layers size={18} />
            <span>Basic Details</span>
          </button>
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'properties' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-3">
              <Settings size={18} />
              <span>Properties</span>
            </div>
            <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full font-mono">
              {formData.propertyDefinitions.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'preview' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Eye size={18} />
            <span>Form Preview</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'basic' && (
              <ObjectTypeForm 
                data={formData} 
                onChange={setFormData} 
                disabled={isSystem} 
              />
            )}
            
            {activeTab === 'properties' && (
              <PropertyDefinitionEditor 
                properties={formData.propertyDefinitions}
                onChange={(props) => setFormData(prev => ({ ...prev, propertyDefinitions: props }))}
              />
            )}

            {activeTab === 'preview' && (
              <PreviewObjectForm 
                typeDef={formData}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Settings: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);
