import React, { useState } from 'react';
import { navStore } from '../../api/nav.store';
import { SpatialNode, ConnectionType } from '../../types/connection';
import { Floor } from '../../types/floor';
import { ArrowUpDown, X, Check } from 'lucide-react';

interface FloorConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFloorId?: string;
  campusId?: string;
  buildingId?: string;
  floors: Floor[];
  nodes: SpatialNode[];
  onConnectionCreated?: () => void;
}

export const FloorConnectorModal: React.FC<FloorConnectorModalProps> = ({
  isOpen,
  onClose,
  currentFloorId,
  campusId,
  buildingId,
  floors,
  nodes,
  onConnectionCreated,
}) => {
  const [sourceFloorId, setSourceFloorId] = useState(currentFloorId || '');
  const [targetFloorId, setTargetFloorId] = useState('');
  const [sourceNodeId, setSourceNodeId] = useState('');
  const [targetNodeId, setTargetNodeId] = useState('');
  const [connectionType, setConnectionType] = useState<ConnectionType>('staircase');
  const [name, setName] = useState('Inter-floor Connection');
  const [isBidirectional, setIsBidirectional] = useState(true);
  const [isAccessible, setIsAccessible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const sourceFloorNodes = nodes.filter(n => n.floorId === sourceFloorId);
  const targetFloorNodes = nodes.filter(n => n.floorId === targetFloorId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sourceNodeId || !targetNodeId) {
      setError('Please select both source and target nodes.');
      return;
    }
    if (sourceNodeId === targetNodeId) {
      setError('Source and target nodes cannot be identical.');
      return;
    }
    if (!campusId) {
      setError('Active campus is required.');
      return;
    }

    const res = navStore.createConnection({
      campusId,
      sourceBuildingId: buildingId,
      sourceFloorId,
      sourceNodeId,
      targetBuildingId: buildingId,
      targetFloorId,
      targetNodeId,
      connectionType,
      name: name || `${connectionType} Connection`,
      isBidirectional,
      isAccessible: connectionType === 'elevator' ? true : isAccessible,
      isWalkable: true,
      isVehicleAccessible: false,
      distanceMeters: connectionType === 'elevator' ? 4 : 8,
      weightMultiplier: connectionType === 'staircase' ? 2.0 : 1.2,
    });

    if ('error' in res) {
      setError(res.error);
      return;
    }

    onConnectionCreated?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-800 text-sm">Connect Floors (Stairs / Elevator)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Connector Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['staircase', 'elevator', 'ramp'] as ConnectionType[]).map(t => (
                <button
                  type="button"
                  key={t}
                  onClick={() => {
                    setConnectionType(t);
                    if (t === 'elevator') setIsAccessible(true);
                  }}
                  className={`py-2 px-3 rounded-lg border font-medium capitalize text-center transition-all ${
                    connectionType === t
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Connection Label</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Main Staircase (Floor 1 to 2)"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Source node selection */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="font-semibold text-slate-700 block">From (Source)</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-500">Floor</label>
                <select
                  value={sourceFloorId}
                  onChange={e => {
                    setSourceFloorId(e.target.value);
                    setSourceNodeId('');
                  }}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="">Select floor...</option>
                  {floors.map(f => (
                    <option key={f.id} value={f.id}>
                      {typeof f.name === 'string' ? f.name : (f.name as any).en || f.code} (Lvl {f.level})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Node</label>
                <select
                  value={sourceNodeId}
                  onChange={e => setSourceNodeId(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                  disabled={!sourceFloorId}
                >
                  <option value="">Select node...</option>
                  {sourceFloorNodes.map(n => (
                    <option key={n.id} value={n.id}>{n.label || `${n.type} (${Math.round(n.coordinates.x)}, ${Math.round(n.coordinates.y)})`}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Target node selection */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="font-semibold text-slate-700 block">To (Target)</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-500">Floor</label>
                <select
                  value={targetFloorId}
                  onChange={e => {
                    setTargetFloorId(e.target.value);
                    setTargetNodeId('');
                  }}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="">Select floor...</option>
                  {floors.filter(f => f.id !== sourceFloorId).map(f => (
                    <option key={f.id} value={f.id}>
                      {typeof f.name === 'string' ? f.name : (f.name as any).en || f.code} (Lvl {f.level})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Node</label>
                <select
                  value={targetNodeId}
                  onChange={e => setTargetNodeId(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                  disabled={!targetFloorId}
                >
                  <option value="">Select node...</option>
                  {targetFloorNodes.map(n => (
                    <option key={n.id} value={n.id}>{n.label || `${n.type} (${Math.round(n.coordinates.x)}, ${Math.round(n.coordinates.y)})`}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isBidirectional}
                onChange={e => setIsBidirectional(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">Bidirectional</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAccessible}
                onChange={e => setIsAccessible(e.target.checked)}
                disabled={connectionType === 'elevator'}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">Wheelchair Accessible</span>
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Check size={14} /> Create Connector
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
