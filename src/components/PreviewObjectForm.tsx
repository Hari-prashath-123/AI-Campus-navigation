import React from 'react';
import { ObjectTypeFormData, PropertyDefinition } from '../types';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { MapPin, Info } from 'lucide-react';
import * as icons from 'lucide-react';

interface Props {
  typeDef: ObjectTypeFormData;
}

export const PreviewObjectForm: React.FC<Props> = ({ typeDef }) => {
  const IconComponent = (icons as any)[typeDef.iconName] || icons.Box;

  return (
    <div className="flex gap-8 max-w-6xl mx-auto">
      
      {/* 1. Left: The Data Entry Form Preview */}
      <div className="flex-1 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-lg font-outfit font-semibold text-slate-900">Create New Object</h2>
              <p className="text-sm text-slate-500 mt-1">This is a preview of the object creation form.</p>
            </div>
            <Badge variant="neutral">{typeDef.name}</Badge>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Standard Object Fields */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Standard Details</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input label="Name *" placeholder={`e.g. Main ${typeDef.name}`} />
                <Input label="Code" placeholder="e.g. ROOM-101" />
              </div>
              <Input label="Description" placeholder="Optional notes..." as="textarea" rows={2} />
            </div>

            <hr className="border-slate-100" />

            {/* Dynamic Custom Properties */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 text-blue-600 flex justify-between">
                <span>{typeDef.name} Properties</span>
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{typeDef.propertyDefinitions.length} fields</span>
              </h3>
              
              {typeDef.propertyDefinitions.length === 0 ? (
                <div className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-lg border border-slate-100">
                  No custom properties defined for this object type.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {typeDef.propertyDefinitions.map((prop) => (
                    <DynamicField key={prop.id} prop={prop} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Right: The Map Card Preview */}
      <div className="w-80 shrink-0">
        <div className="sticky top-6">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MapPin size={16} className="text-slate-400" />
            Map Card Preview
          </h3>
          
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="h-24 bg-slate-100 relative">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
              <div 
                className="absolute -bottom-6 left-4 w-12 h-12 rounded-xl border-4 border-white flex items-center justify-center shadow-sm"
                style={{ backgroundColor: typeDef.color }}
              >
                <IconComponent size={24} className="text-white" />
              </div>
            </div>
            
            <div className="p-4 pt-8">
              <h4 className="font-outfit font-bold text-lg text-slate-900">Example {typeDef.name}</h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5 mb-3">{typeDef.category.toUpperCase()} • CODE-123</p>
              
              <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                This is how the object summary card will appear to users when they tap on it in the map.
              </p>

              <div className="space-y-2">
                {typeDef.propertyDefinitions.filter(p => p.isVisibleOnCard).length === 0 ? (
                  <p className="text-xs italic text-slate-400">No properties selected for card view.</p>
                ) : (
                  typeDef.propertyDefinitions
                    .filter(p => p.isVisibleOnCard)
                    .slice(0, 4) // Show max 4 on card preview
                    .map(prop => (
                      <div key={prop.id} className="flex justify-between items-center text-sm py-1 border-b border-slate-50 last:border-0">
                        <span className="text-slate-500">{prop.label}</span>
                        <span className="font-medium text-slate-900">
                          {prop.type === 'boolean' ? 'Yes' : (prop.placeholder || 'Value')} {prop.unit}
                        </span>
                      </div>
                  ))
                )}
                {typeDef.propertyDefinitions.filter(p => p.isVisibleOnCard).length > 4 && (
                  <p className="text-xs text-center text-blue-600 pt-2">+ {typeDef.propertyDefinitions.filter(p => p.isVisibleOnCard).length - 4} more details</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component to render form fields dynamically
const DynamicField: React.FC<{ prop: PropertyDefinition }> = ({ prop }) => {
  const labelWithReq = `${prop.label} ${prop.required ? '*' : ''}`;

  switch (prop.type) {
    case 'boolean':
      return (
        <div className="col-span-1 md:col-span-2">
          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
            <input type="checkbox" className="w-5 h-5 text-blue-600 rounded border-slate-300" defaultChecked={prop.defaultValue as boolean} />
            <div>
              <p className="font-medium text-slate-900">{labelWithReq}</p>
              {prop.description && <p className="text-xs text-slate-500">{prop.description}</p>}
            </div>
          </label>
        </div>
      );
      
    case 'select':
      return (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">{labelWithReq}</label>
          <select className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">{prop.placeholder || 'Select...'}</option>
            {prop.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {prop.description && <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Info size={12}/>{prop.description}</p>}
        </div>
      );
      
    case 'multi_select':
      return (
        <div className="col-span-1 md:col-span-2 space-y-2">
          <label className="block text-sm font-medium text-slate-700">{labelWithReq}</label>
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
            {prop.options?.map(o => (
              <label key={o.value} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 cursor-pointer shadow-sm hover:border-blue-400">
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm font-medium">{o.label}</span>
              </label>
            ))}
          </div>
          {prop.description && <p className="text-xs text-slate-500">{prop.description}</p>}
        </div>
      );

    case 'number':
      return (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">{labelWithReq}</label>
          <div className="relative">
            <input 
              type="number" 
              className={`w-full pl-3 ${prop.unit ? 'pr-12' : 'pr-3'} py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder={prop.placeholder}
              min={prop.min}
              max={prop.max}
            />
            {prop.unit && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{prop.unit}</span>
            )}
          </div>
          {prop.description && <p className="text-xs text-slate-500">{prop.description}</p>}
        </div>
      );

    case 'text':
      return (
        <div className={prop.multiline ? "col-span-1 md:col-span-2" : ""}>
          <Input 
            label={labelWithReq}
            placeholder={prop.placeholder}
            helperText={prop.description}
            as={prop.multiline ? "textarea" : "input"}
            rows={prop.multiline ? 3 : undefined}
          />
        </div>
      );

    default:
      return (
        <Input 
          label={labelWithReq}
          placeholder={prop.placeholder || `Enter ${prop.label}...`}
          helperText={prop.description}
        />
      );
  }
};
