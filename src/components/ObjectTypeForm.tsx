import React from 'react';
import { ObjectTypeFormData, OBJECT_CATEGORIES } from '../types';
import { Input } from './ui/Input';
import { Shield } from 'lucide-react';

interface Props {
  data: ObjectTypeFormData;
  onChange: (data: ObjectTypeFormData) => void;
  disabled?: boolean;
}

export const ObjectTypeForm: React.FC<Props> = ({ data, onChange, disabled = false }) => {
  const handleChange = (field: keyof ObjectTypeFormData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-lg font-outfit font-semibold text-slate-900">Basic Details</h2>
        <p className="text-sm text-slate-500 mt-1">Configure the core identity and behavior of this object type.</p>
      </div>

      <div className="p-6 space-y-8">
        {disabled && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-blue-800">
            <Shield className="shrink-0 mt-0.5" size={18} />
            <div className="text-sm">
              <p className="font-semibold">System Type Locked</p>
              <p className="mt-1 opacity-90">
                Because this is a core system type, you cannot change its name, slug, category, or behavior. 
                You may only customize its property definitions in the Properties tab.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Name"
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={disabled}
            placeholder="e.g. Classroom"
            required
            helperText="Human-readable name in English."
          />
          <Input
            label="Slug (Unique ID)"
            value={data.slug}
            onChange={(e) => handleChange('slug', e.target.value)}
            disabled={disabled}
            placeholder="e.g. classroom"
            required
            helperText="Lowercase alphanumeric with hyphens. Used in API."
          />
        </div>

        <Input
          label="Description"
          value={data.description}
          onChange={(e) => handleChange('description', e.target.value)}
          disabled={disabled}
          placeholder="e.g. General-purpose teaching room..."
          as="textarea"
          rows={3}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Category</label>
            <select
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              value={data.category}
              onChange={(e) => handleChange('category', e.target.value)}
              disabled={disabled}
            >
              {OBJECT_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          
          <Input
            label="Icon Name (Lucide)"
            value={data.iconName}
            onChange={(e) => handleChange('iconName', e.target.value)}
            disabled={disabled}
            placeholder="e.g. BookOpen"
          />
          
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Brand Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                className="w-10 h-10 p-1 bg-white border border-slate-300 rounded-md cursor-pointer disabled:opacity-50"
                value={data.color}
                onChange={(e) => handleChange('color', e.target.value)}
                disabled={disabled}
              />
              <Input
                value={data.color}
                onChange={(e) => handleChange('color', e.target.value)}
                disabled={disabled}
                placeholder="#3b82f6"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <h3 className="text-md font-medium text-slate-900 mb-4">Routing & Behavior</h3>
          
          <div className="space-y-4">
            <label className={`flex items-start gap-3 p-4 rounded-lg border ${data.isNavigable ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'} ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
              <input 
                type="checkbox" 
                className="mt-1 w-4 h-4 text-blue-600 rounded" 
                checked={data.isNavigable}
                onChange={(e) => handleChange('isNavigable', e.target.checked)}
                disabled={disabled}
              />
              <div>
                <p className="font-medium text-slate-900">Navigable Destination</p>
                <p className="text-sm text-slate-500">Users can search for and route to objects of this type.</p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-4 rounded-lg border ${data.isBarrier ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-white'} ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
              <input 
                type="checkbox" 
                className="mt-1 w-4 h-4 text-amber-600 rounded" 
                checked={data.isBarrier}
                onChange={(e) => handleChange('isBarrier', e.target.checked)}
                disabled={disabled}
              />
              <div>
                <p className="font-medium text-slate-900">Physical Barrier</p>
                <p className="text-sm text-slate-500">The routing engine will actively avoid crossing through this object.</p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-4 rounded-lg border ${data.isConnector ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'} ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
              <input 
                type="checkbox" 
                className="mt-1 w-4 h-4 text-emerald-600 rounded" 
                checked={data.isConnector}
                onChange={(e) => handleChange('isConnector', e.target.checked)}
                disabled={disabled}
              />
              <div>
                <p className="font-medium text-slate-900">Floor Connector</p>
                <p className="text-sm text-slate-500">Acts as a node that connects multiple floors (e.g., stairs, elevators).</p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
