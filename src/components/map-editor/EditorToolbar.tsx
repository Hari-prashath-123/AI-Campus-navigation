import React from 'react';
import { MousePointer2, Hand, Square, Hexagon, Minus, MapPin, Undo2, Redo2, Copy, Trash2, Grid3X3 } from 'lucide-react';
import { EditorTool } from '../../types';

interface EditorToolbarProps {
  tool: EditorTool;
  setTool: (tool: EditorTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  hasSelection: boolean;
  isSnapping: boolean;
  toggleSnapping: () => void;
  onOpenCalibration: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  tool, setTool, canUndo, canRedo, onUndo, onRedo, onDuplicate, onDelete, hasSelection, isSnapping, toggleSnapping,
}) => {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'pan', icon: Hand, label: 'Pan (H)' },
    { separator: true },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'polygon', icon: Hexagon, label: 'Polygon (P)' },
    { id: 'line', icon: Minus, label: 'Line / Path (L)' },
    { id: 'point', icon: MapPin, label: 'Point of Interest (M)' },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-slate-200 flex items-center p-1.5 gap-1 select-none z-10">
      {tools.map((t, idx) => {
        if (t.separator) return <div key={idx} className="w-px h-6 bg-slate-200 mx-1" />;
        const Icon = t.icon!;
        const isActive = tool === t.id;
        return (
          <button
            key={t.id}
            title={t.label}
            className={`p-2 rounded-md transition-colors ${isActive ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => setTool(t.id as EditorTool)}
          >
            <Icon size={18} />
          </button>
        );
      })}

      <div className="w-px h-6 bg-slate-200 mx-1" />
      
      <button 
        title="Undo (Ctrl+Z)"
        disabled={!canUndo}
        className="p-2 rounded-md transition-colors text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
        onClick={onUndo}
      >
        <Undo2 size={18} />
      </button>
      <button 
        title="Redo (Ctrl+Y)"
        disabled={!canRedo}
        className="p-2 rounded-md transition-colors text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
        onClick={onRedo}
      >
        <Redo2 size={18} />
      </button>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <button 
        title="Duplicate (Ctrl+D)"
        disabled={!hasSelection}
        className="p-2 rounded-md transition-colors text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
        onClick={onDuplicate}
      >
        <Copy size={18} />
      </button>
      <button 
        title="Delete (Del)"
        disabled={!hasSelection}
        className="p-2 rounded-md transition-colors text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
        onClick={onDelete}
      >
        <Trash2 size={18} />
      </button>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <button 
        title="Snap to Grid"
        className={`p-2 rounded-md transition-colors ${isSnapping ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
        onClick={toggleSnapping}
      >
        <Grid3X3 size={18} />
      </button>
    </div>
  );
};
