import React from 'react';
import { MapEditor } from '../components/map-editor/MapEditor';

export const MapEditorPage: React.FC = () => {
  return (
    <div className="flex-1 w-full h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-outfit font-bold text-slate-900 tracking-tight">Map Editor</h1>
          <p className="text-xs text-slate-500">Demo Campus • First Floor</p>
        </div>
        <div className="flex gap-2 text-sm text-slate-500">
          <span>All changes auto-saved to local memory for this demo.</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <MapEditor />
      </div>
    </div>
  );
};
