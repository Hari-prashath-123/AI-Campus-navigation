import React, { useState } from 'react';
import { MapCalibration, UnitSystem, formatLength } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Ruler, RefreshCcw } from 'lucide-react';

interface MapCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  calibration: MapCalibration;
  onChange: (c: MapCalibration) => void;
}

export const MapCalibrationModal: React.FC<MapCalibrationModalProps> = ({
  isOpen, onClose, calibration, onChange,
}) => {
  const [draft, setDraft] = useState<MapCalibration>(calibration);

  const handleSave = () => {
    onChange(draft);
    onClose();
  };

  const pxPerMeter = draft.canvasWidthPx / draft.realWidthMeters;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Map Calibration & Settings">
      <div className="space-y-6">

        {/* Unit System */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">Unit System</label>
          <div className="grid grid-cols-2 gap-3">
            {(['metric', 'imperial'] as UnitSystem[]).map(u => (
              <button
                key={u}
                onClick={() => setDraft(d => ({ ...d, unitSystem: u }))}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-semibold capitalize transition-all ${
                  draft.unitSystem === u
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {u === 'metric' ? '📐 Metric (m, m²)' : '📏 Imperial (ft, ft²)'}
              </button>
            ))}
          </div>
        </div>

        {/* Real-world dimensions */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Ruler size={16} />
            Real-World Canvas Dimensions
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Total Width (meters)</label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={draft.realWidthMeters}
                onChange={e => setDraft(d => ({ ...d, realWidthMeters: parseFloat(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {draft.unitSystem === 'imperial'
                  ? `≈ ${(draft.realWidthMeters * 3.28084).toFixed(1)} ft`
                  : `${draft.realWidthMeters} m`}
              </p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Total Height (meters)</label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={draft.realHeightMeters}
                onChange={e => setDraft(d => ({ ...d, realHeightMeters: parseFloat(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {draft.unitSystem === 'imperial'
                  ? `≈ ${(draft.realHeightMeters * 3.28084).toFixed(1)} ft`
                  : `${draft.realHeightMeters} m`}
              </p>
            </div>
          </div>
        </div>

        {/* Canvas resolution */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">Canvas Resolution (Logical Pixels)</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Width (px)</label>
              <input
                type="number"
                min="200"
                step="100"
                value={draft.canvasWidthPx}
                onChange={e => setDraft(d => ({ ...d, canvasWidthPx: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Height (px)</label>
              <input
                type="number"
                min="200"
                step="100"
                value={draft.canvasHeightPx}
                onChange={e => setDraft(d => ({ ...d, canvasHeightPx: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Derived scale summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Derived Scale</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-slate-900">{pxPerMeter.toFixed(1)}</p>
              <p className="text-[11px] text-slate-500">px / meter</p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{formatLength(1, draft.unitSystem)}</p>
              <p className="text-[11px] text-slate-500">= {pxPerMeter.toFixed(0)} px</p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{draft.realWidthMeters}×{draft.realHeightMeters}</p>
              <p className="text-[11px] text-slate-500">canvas m²</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-2 border-t border-slate-100">
          <button
            onClick={() => setDraft({ realWidthMeters: 100, realHeightMeters: 80, unitSystem: 'metric', canvasWidthPx: 1200, canvasHeightPx: 960 })}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <RefreshCcw size={14} /> Reset to defaults
          </button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>Apply Calibration</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
