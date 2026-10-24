import React from 'react';
import { MapCalibration, pxToMeters, formatLength, formatArea } from '../../types';

interface MeasurementOverlayProps {
  /** Shape being drawn right now (null = nothing in progress) */
  draftX: number;
  draftY: number;
  draftWidth: number;
  draftHeight: number;
  geometryType: 'polygon' | 'polyline' | 'point' | null;
  calibration: MapCalibration;
  visible: boolean;
}

export const MeasurementOverlay: React.FC<MeasurementOverlayProps> = ({
  draftX, draftY, draftWidth, draftHeight, geometryType, calibration, visible,
}) => {
  if (!visible || !geometryType || geometryType === 'point') return null;

  const widthM = pxToMeters(Math.abs(draftWidth), calibration);
  const heightM = pxToMeters(Math.abs(draftHeight), calibration);
  const areaM2 = widthM * heightM;
  const unit = calibration.unitSystem;

  if (geometryType === 'polygon') {
    if (widthM < 0.1 || heightM < 0.1) return null;
    return (
      <div
        className="absolute pointer-events-none z-20 select-none"
        style={{
          left: draftX + Math.max(0, draftWidth) / 2,
          top: draftY + Math.max(0, draftHeight) / 2,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="bg-slate-900/90 text-white text-xs rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm whitespace-nowrap">
          <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 text-center">
            <div>
              <div className="text-slate-400 text-[9px] uppercase tracking-wider">Width</div>
              <div className="font-bold font-mono">{formatLength(widthM, unit)}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[9px] uppercase tracking-wider">Height</div>
              <div className="font-bold font-mono">{formatLength(heightM, unit)}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[9px] uppercase tracking-wider">Area</div>
              <div className="font-bold font-mono text-blue-400">{formatArea(areaM2, unit)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (geometryType === 'polyline') {
    const lengthM = pxToMeters(Math.sqrt(draftWidth * draftWidth + draftHeight * draftHeight), calibration);
    if (lengthM < 0.1) return null;
    return (
      <div
        className="absolute pointer-events-none z-20 select-none"
        style={{ left: draftX + draftWidth / 2, top: draftY + draftHeight / 2, transform: 'translate(-50%, -120%)' }}
      >
        <div className="bg-slate-900/90 text-white text-xs rounded-lg px-3 py-1.5 shadow-lg backdrop-blur-sm whitespace-nowrap">
          <span className="text-slate-400 text-[9px] uppercase tracking-wider mr-1">Length</span>
          <span className="font-bold font-mono">{formatLength(lengthM, unit)}</span>
        </div>
      </div>
    );
  }

  return null;
};
