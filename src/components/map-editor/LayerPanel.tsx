import React from 'react';
import { LayerVisibility } from '../../types/map-editor';
import { Layers, Image, Box, MapPin, GitBranch, Grid3X3, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface LayerPanelProps {
  layers: LayerVisibility;
  onToggleLayer: (layerKey: keyof LayerVisibility) => void;
  isOpen: boolean;
  onClose: () => void;
  counts?: {
    objects: number;
    nodes: number;
    edges: number;
    warnings: number;
  };
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  onToggleLayer,
  isOpen,
  onClose,
  counts,
}) => {
  if (!isOpen) return null;

  const layerItems: {
    key: keyof LayerVisibility;
    label: string;
    icon: React.ElementType;
    color: string;
    count?: number;
  }[] = [
    { key: 'floorplanImage', label: 'Floor Plan Image', icon: Image, color: 'text-indigo-500' },
    { key: 'objects', label: 'Rooms & POIs', icon: Box, color: 'text-blue-500', count: counts?.objects },
    { key: 'nodes', label: 'Navigation Nodes', icon: MapPin, color: 'text-emerald-500', count: counts?.nodes },
    { key: 'edges', label: 'Paths & Connections', icon: GitBranch, color: 'text-purple-500', count: counts?.edges },
    { key: 'grid', label: 'Measurement Grid', icon: Grid3X3, color: 'text-slate-400' },
    { key: 'validationWarnings', label: 'Validation Warnings', icon: AlertTriangle, color: 'text-amber-500', count: counts?.warnings },
  ];

  return (
    <div className="absolute top-14 left-4 z-30 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-blue-600" />
          <span className="text-xs font-semibold text-slate-800">Map Layers</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5 rounded hover:bg-slate-200"
        >
          ✕
        </button>
      </div>

      <div className="p-2 space-y-1">
        {layerItems.map(item => {
          const Icon = item.icon;
          const isVisible = layers[item.key] ?? true;

          return (
            <div
              key={item.key}
              onClick={() => onToggleLayer(item.key)}
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all text-xs ${
                isVisible
                  ? 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={14} className={isVisible ? item.color : 'text-slate-400'} />
                <span className="font-medium">{item.label}</span>
                {item.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    item.key === 'validationWarnings' && item.count > 0
                      ? 'bg-amber-100 text-amber-700 font-bold'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {item.count}
                  </span>
                )}
              </div>

              <button
                className={`p-1 rounded hover:bg-white transition-colors ${
                  isVisible ? 'text-blue-600' : 'text-slate-400'
                }`}
                title={isVisible ? 'Hide layer' : 'Show layer'}
              >
                {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
