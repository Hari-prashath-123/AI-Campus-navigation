import React, { useEffect, useState } from 'react';
import { EditorShape, ObjectType, PropertyDefinition, MapCalibration, formatArea } from '../../types';
import { Input } from '../ui/Input';
import { Layers, Loader2, Save, Ruler, Copy, X } from 'lucide-react';
import { objectTypeService } from '../../api/object-type.service';
import { Button } from '../ui/Button';

interface EditorSidebarProps {
  selectedShapes: EditorShape[];
  updateShape: (id: string, updates: Partial<EditorShape>) => void;
  onDuplicate: () => void;
  calibration: MapCalibration;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({ selectedShapes, updateShape, onDuplicate, calibration }) => {
  const [typeDef, setTypeDef] = useState<ObjectType | null>(null);
  const [loading, setLoading] = useState(false);

  const shape = selectedShapes.length === 1 ? selectedShapes[0] : null;

  useEffect(() => {
    if (shape && shape.objectTypeId && shape.objectTypeId !== 'generic') {
      const loadType = async () => {
        setLoading(true);
        const res = await objectTypeService.getById(shape.objectTypeId);
        if (res.success) setTypeDef(res.data);
        else setTypeDef(null);
        setLoading(false);
      };
      loadType();
    } else {
      setTypeDef(null);
    }
  }, [shape?.objectTypeId]);

  const closeSidebar = () => document.getElementById('editor-sidebar')?.classList.add('hidden');

  if (selectedShapes.length === 0) {
    return (
      <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-sm z-10">
        <div className="flex justify-end p-2 border-b border-slate-100">
          <Button variant="ghost" size="sm" onClick={closeSidebar} title="Close Panel">
            <X size={16} />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
          <Layers className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-sm">Select an object on the map to view and edit its properties.</p>
        </div>
      </div>
    );
  }

  if (selectedShapes.length > 1) {
    return (
      <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-sm z-10">
        <div className="flex justify-end p-2 border-b border-slate-100">
          <Button variant="ghost" size="sm" onClick={closeSidebar} title="Close Panel">
            <X size={16} />
          </Button>
        </div>
        <div className="p-6">
          <h3 className="font-semibold text-slate-900 mb-2">Multiple Selection</h3>
          <p className="text-sm text-slate-500">{selectedShapes.length} objects selected.</p>
        </div>
      </div>
    );
  }

  if (!shape) return null;

  const handleAttributeChange = (key: string, value: any) => {
    const updatedAttributes = { ...(shape.attributes || {}), [key]: value };
    updateShape(shape.id, { attributes: updatedAttributes });
  };

  const handleSaveToDatabase = () => {
    // In a real implementation, this would call mapObjectService.create/update
    alert(`Object ${shape.name} saved to database with properties:\n${JSON.stringify(shape.attributes, null, 2)}`);
  };

  const handleDuplicate = () => {
    onDuplicate();
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-sm z-10">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: shape.color }}></div>
          </div>
          <div>
            <h3 className="font-outfit font-semibold text-slate-900 truncate max-w-[150px]">{shape.name}</h3>
            <p className="text-xs text-slate-500 font-mono">{typeDef ? typeDef.name : shape.objectTypeId} • {shape.geometryType}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={closeSidebar} title="Close Panel">
            <X size={14} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate} title="Duplicate">
            <Copy size={14} />
          </Button>
          <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={handleSaveToDatabase}>
            Save
          </Button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        
        {/* Core Properties */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Core Identity</h4>
          <Input 
            label="Display Name" 
            value={shape.name} 
            onChange={e => updateShape(shape.id, { name: e.target.value })}
          />
        </div>

        {/* Dynamic Properties from ObjectType */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex justify-between">
            <span>{typeDef ? typeDef.name : 'Dynamic'} Properties</span>
            {loading && <Loader2 size={12} className="animate-spin text-blue-500" />}
          </h4>
          
          {!typeDef && !loading && (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500">
              No specific object type assigned.
            </div>
          )}

          {typeDef && typeDef.propertyDefinitions.length === 0 && (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500">
              This object type has no custom properties.
            </div>
          )}

          {typeDef && typeDef.propertyDefinitions.map(prop => (
            <DynamicField 
              key={prop.id} 
              prop={prop} 
              value={shape.attributes?.[prop.key]}
              onChange={(val) => handleAttributeChange(prop.key, val)}
            />
          ))}
        </div>

        {/* Geometry Settings */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Ruler size={14} />
            Real-World Geometry
          </h4>

          {shape.realWorld ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input 
                  label={`X Position (${calibration.unitSystem === 'imperial' ? 'ft' : 'm'})`}
                  type="number" 
                  step="0.1"
                  value={calibration.unitSystem === 'imperial' ? (shape.realWorld.originXMeters * 3.28084).toFixed(1) : shape.realWorld.originXMeters.toFixed(1)} 
                  onChange={e => {
                    const val = Number(e.target.value);
                    const meters = calibration.unitSystem === 'imperial' ? val / 3.28084 : val;
                    updateShape(shape.id, { 
                      x: meters * (calibration.canvasWidthPx / calibration.realWidthMeters),
                    });
                  }}
                />
                <Input 
                  label={`Y Position (${calibration.unitSystem === 'imperial' ? 'ft' : 'm'})`}
                  type="number" 
                  step="0.1"
                  value={calibration.unitSystem === 'imperial' ? (shape.realWorld.originYMeters * 3.28084).toFixed(1) : shape.realWorld.originYMeters.toFixed(1)} 
                  onChange={e => {
                    const val = Number(e.target.value);
                    const meters = calibration.unitSystem === 'imperial' ? val / 3.28084 : val;
                    updateShape(shape.id, { 
                      y: meters * (calibration.canvasHeightPx / calibration.realHeightMeters),
                    });
                  }}
                />
              </div>

              {(shape.geometryType === 'polygon' || shape.width !== undefined) && shape.realWorld.widthMeters !== undefined && shape.realWorld.heightMeters !== undefined && (
                <div className="grid grid-cols-2 gap-3">
                  <Input 
                    label={`Width (${calibration.unitSystem === 'imperial' ? 'ft' : 'm'})`}
                    type="number" 
                    step="0.1"
                    value={calibration.unitSystem === 'imperial' ? (shape.realWorld.widthMeters * 3.28084).toFixed(1) : shape.realWorld.widthMeters.toFixed(1)} 
                    onChange={e => {
                      const val = Number(e.target.value);
                      const meters = calibration.unitSystem === 'imperial' ? val / 3.28084 : val;
                      updateShape(shape.id, { 
                        width: meters * (calibration.canvasWidthPx / calibration.realWidthMeters),
                      });
                    }}
                  />
                  <Input 
                    label={`Height (${calibration.unitSystem === 'imperial' ? 'ft' : 'm'})`}
                    type="number" 
                    step="0.1"
                    value={calibration.unitSystem === 'imperial' ? (shape.realWorld.heightMeters * 3.28084).toFixed(1) : shape.realWorld.heightMeters.toFixed(1)} 
                    onChange={e => {
                      const val = Number(e.target.value);
                      const meters = calibration.unitSystem === 'imperial' ? val / 3.28084 : val;
                      updateShape(shape.id, { 
                        height: meters * (calibration.canvasHeightPx / calibration.realHeightMeters),
                      });
                    }}
                  />
                </div>
              )}
              
              {shape.realWorld.areaM2 !== undefined && (
                 <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-sm">
                   <span className="text-slate-500 font-medium">Area</span>
                   <span className="font-bold text-slate-900 font-mono">{formatArea(shape.realWorld.areaM2, calibration.unitSystem)}</span>
                 </div>
              )}
            </>
          ) : (
             <div className="text-xs text-slate-400 italic">
               Draw a shape or modify an existing one to see real-world measurements.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for dynamic fields
const DynamicField: React.FC<{ prop: PropertyDefinition; value: any; onChange: (val: any) => void }> = ({ prop, value, onChange }) => {
  switch (prop.type) {
    case 'boolean':
      return (
        <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer shadow-sm hover:border-blue-300">
          <input 
            type="checkbox" 
            className="w-4 h-4 text-blue-600 rounded" 
            checked={!!value}
            onChange={e => onChange(e.target.checked)} 
          />
          <div>
            <span className="text-sm font-medium text-slate-900">{prop.label} {prop.required && '*'}</span>
            {prop.description && <p className="text-xs text-slate-500">{prop.description}</p>}
          </div>
        </label>
      );
    
    case 'select':
      return (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">{prop.label} {prop.required && '*'}</label>
          <select 
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          >
            <option value="">{prop.placeholder || 'Select option...'}</option>
            {prop.options?.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      );

    case 'number':
      return (
        <div className="relative">
          <Input 
            label={`${prop.label} ${prop.required ? '*' : ''}`}
            type="number" 
            value={value || ''} 
            onChange={e => onChange(Number(e.target.value))}
            placeholder={prop.placeholder}
            className={prop.unit ? "pr-10" : ""}
          />
          {prop.unit && (
            <span className="absolute right-3 top-[30px] text-xs text-slate-400 font-medium">{prop.unit}</span>
          )}
        </div>
      );
      
    case 'text':
      return (
        <Input 
          label={`${prop.label} ${prop.required ? '*' : ''}`}
          value={value || ''} 
          onChange={e => onChange(e.target.value)}
          placeholder={prop.placeholder}
          as={prop.multiline ? "textarea" : "input"}
          rows={prop.multiline ? 3 : undefined}
          helperText={prop.description}
        />
      );

    default:
      return (
        <Input 
          label={`${prop.label} ${prop.required ? '*' : ''}`}
          value={value || ''} 
          onChange={e => onChange(e.target.value)}
          placeholder={prop.placeholder}
        />
      );
  }
};
