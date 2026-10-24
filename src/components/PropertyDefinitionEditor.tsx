import React, { useState } from 'react';
import { PropertyDefinition, PropertyFieldType } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Plus, Trash2, Edit2, Settings2, Check } from 'lucide-react';
import { generateEntityId } from '../utils/validation';
import { Modal } from './ui/Modal';

interface Props {
  properties: PropertyDefinition[];
  onChange: (properties: PropertyDefinition[]) => void;
}

const FIELD_TYPES: { value: PropertyFieldType; label: string }[] = [
  { value: 'text', label: 'Text (Short or Long)' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Toggle (Yes/No)' },
  { value: 'select', label: 'Select (Single)' },
  { value: 'multi_select', label: 'Multi-Select' },
  { value: 'image', label: 'Image Upload' },
  { value: 'time', label: 'Time' },
  { value: 'date', label: 'Date' },
  { value: 'dimensions', label: 'Dimensions (L/W/H)' },
  { value: 'object_reference', label: 'Reference to Object' },
];

export const PropertyDefinitionEditor: React.FC<Props> = ({ properties, onChange }) => {
  const [editingProp, setEditingProp] = useState<PropertyDefinition | null>(null);

  const handleAdd = () => {
    setEditingProp({
      id: generateEntityId('prop'),
      key: '',
      label: '',
      type: 'text',
      required: false,
      isVisibleOnCard: false,
      isSearchable: false,
      sortOrder: properties.length
    });
  };

  const handleSaveProp = () => {
    if (!editingProp) return;
    
    // Auto-generate key if empty
    let newKey = editingProp.key;
    if (!newKey && editingProp.label) {
      newKey = editingProp.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }

    const savedProp = { ...editingProp, key: newKey };
    
    const existingIdx = properties.findIndex(p => p.id === savedProp.id);
    let newProps = [...properties];
    
    if (existingIdx >= 0) {
      newProps[existingIdx] = savedProp;
    } else {
      newProps.push(savedProp);
    }
    
    onChange(newProps);
    setEditingProp(null);
  };

  const handleDelete = (id: string) => {
    onChange(properties.filter(p => p.id !== id));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= properties.length) return;
    const newProps = [...properties];
    const temp = newProps[index];
    newProps[index] = newProps[index + direction];
    newProps[index + direction] = temp;
    
    // Re-index sortOrder
    onChange(newProps.map((p, i) => ({ ...p, sortOrder: i })));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-outfit font-semibold text-slate-900">Property Schema</h2>
          <p className="text-sm text-slate-500 mt-1">Define the custom data fields for this object type.</p>
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={handleAdd}>
          Add Property
        </Button>
      </div>

      <div className="flex-1 p-6">
        {properties.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
            <Settings2 className="mx-auto text-slate-400 mb-3" size={48} />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No Properties Defined</h3>
            <p className="text-slate-500 mb-4 max-w-sm mx-auto">This object type has no custom properties yet. Add properties like capacity, operating hours, or department.</p>
            <Button variant="outline" onClick={handleAdd}>Add First Property</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {properties.map((prop, idx) => (
              <div key={prop.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-300 transition-colors group">
                <div className="flex flex-col gap-1 text-slate-400 cursor-ns-resize">
                  <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="hover:text-slate-600 disabled:opacity-30">▲</button>
                  <button onClick={() => moveItem(idx, 1)} disabled={idx === properties.length - 1} className="hover:text-slate-600 disabled:opacity-30">▼</button>
                </div>
                
                <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-4 flex flex-col">
                    <span className="font-medium text-slate-900">{prop.label}</span>
                    <span className="text-xs text-slate-500 font-mono">{prop.key}</span>
                  </div>
                  <div className="col-span-3">
                    <Badge variant="neutral">{FIELD_TYPES.find(f => f.value === prop.type)?.label || prop.type}</Badge>
                  </div>
                  <div className="col-span-3 flex flex-wrap gap-1">
                    {prop.required && <Badge variant="danger" className="text-[10px] py-0">Required</Badge>}
                    {prop.isVisibleOnCard && <Badge variant="primary" className="text-[10px] py-0">Card</Badge>}
                    {prop.isSearchable && <Badge variant="success" className="text-[10px] py-0">Searchable</Badge>}
                  </div>
                </div>

                <div className="flex items-center gap-1 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingProp(prop)}>
                    <Edit2 size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50" onClick={() => handleDelete(prop.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!editingProp}
        onClose={() => setEditingProp(null)}
        title={properties.find(p => p.id === editingProp?.id) ? "Edit Property" : "Add Property"}
        size="lg"
      >
        {editingProp && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Display Label *"
                value={editingProp.label}
                onChange={e => setEditingProp({...editingProp, label: e.target.value})}
                placeholder="e.g. Seating Capacity"
              />
              <Input 
                label="Property Key"
                value={editingProp.key}
                onChange={e => setEditingProp({...editingProp, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                placeholder="Auto-generated if empty"
                helperText="Machine name (lowercase, underscores)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Data Type *</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingProp.type}
                  onChange={(e) => setEditingProp({...editingProp, type: e.target.value as PropertyFieldType})}
                >
                  {FIELD_TYPES.map(ft => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </div>
              <Input 
                label="Placeholder / Hint"
                value={editingProp.placeholder || ''}
                onChange={e => setEditingProp({...editingProp, placeholder: e.target.value})}
                placeholder="e.g. Enter total seats"
              />
            </div>

            <Input 
              label="Description (Help Text)"
              value={editingProp.description || ''}
              onChange={e => setEditingProp({...editingProp, description: e.target.value})}
              placeholder="e.g. Only include permanent fixed seats."
            />

            {(editingProp.type === 'select' || editingProp.type === 'multi_select') && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <label className="block text-sm font-medium text-slate-900">Select Options</label>
                <div className="space-y-2">
                  {(editingProp.options || []).map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={opt.label} onChange={e => {
                        const newOpts = [...(editingProp.options || [])];
                        newOpts[i].label = e.target.value;
                        newOpts[i].value = e.target.value.toLowerCase().replace(/\s+/g, '_');
                        setEditingProp({...editingProp, options: newOpts});
                      }} placeholder="Label (e.g. Yes)" className="flex-1" />
                      <Input value={opt.value} onChange={e => {
                        const newOpts = [...(editingProp.options || [])];
                        newOpts[i].value = e.target.value;
                        setEditingProp({...editingProp, options: newOpts});
                      }} placeholder="Value" className="w-1/3" />
                      <Button variant="outline" className="px-3" onClick={() => {
                        const newOpts = [...(editingProp.options || [])];
                        newOpts.splice(i, 1);
                        setEditingProp({...editingProp, options: newOpts});
                      }}>
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" icon={<Plus size={16}/>} onClick={() => {
                    const newOpts = [...(editingProp.options || [])];
                    newOpts.push({ label: '', value: '' });
                    setEditingProp({...editingProp, options: newOpts});
                  }}>Add Option</Button>
                </div>
              </div>
            )}

            {editingProp.type === 'number' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <Input type="number" label="Minimum Value" value={editingProp.min || ''} onChange={e => setEditingProp({...editingProp, min: Number(e.target.value)})} />
                <Input label="Unit (e.g. kg, m²)" value={editingProp.unit || ''} onChange={e => setEditingProp({...editingProp, unit: e.target.value})} />
              </div>
            )}

            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-medium text-slate-900 mb-3">Behavior & Validation</h4>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={editingProp.required} onChange={e => setEditingProp({...editingProp, required: e.target.checked})} />
                  <span className="text-sm text-slate-700">Required Field</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={editingProp.isVisibleOnCard} onChange={e => setEditingProp({...editingProp, isVisibleOnCard: e.target.checked})} />
                  <span className="text-sm text-slate-700">Show on Map Card</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={editingProp.isSearchable} onChange={e => setEditingProp({...editingProp, isSearchable: e.target.checked})} />
                  <span className="text-sm text-slate-700">Searchable</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
              <Button variant="outline" onClick={() => setEditingProp(null)}>Cancel</Button>
              <Button variant="primary" icon={<Check size={18} />} onClick={handleSaveProp} disabled={!editingProp.label}>
                Save Property
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
