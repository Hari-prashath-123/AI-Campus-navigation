import React, { useState, useEffect, useCallback } from 'react';
import { RouteResult, RouteStep } from '../api/routing.service';
import { campusService } from '../api/campus.service';
import { objectService } from '../api/object.service';
import { navStore } from '../api/nav.store';
import { MapViewer } from './MapViewer';
import { Floor, Building, MapObject, SpatialNode, EditorShape, SupportedLanguage } from '../types';
import { CampusConnection } from '../types/connection';
import {
  Play, Pause, SkipBack, SkipForward, X, Volume2, VolumeX,
  Compass, Layers, CornerUpLeft, CornerUpRight, ArrowUp, Check
} from 'lucide-react';

interface RouteSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: RouteResult;
  campusId: string;
  language?: SupportedLanguage;
}

export const RouteSimulationModal: React.FC<RouteSimulationModalProps> = ({
  isOpen,
  onClose,
  route,
  campusId,
  language = 'en',
}) => {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [, setBuildings] = useState<Building[]>([]);
  const [objects, setObjects] = useState<MapObject[]>([]);
  const [nodes, setNodes] = useState<SpatialNode[]>([]);
  const [connections, setConnections] = useState<CampusConnection[]>([]);
  const [shapes, setShapes] = useState<EditorShape[]>([]);

  // Simulation playback state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Derive steps
  const steps: RouteStep[] = React.useMemo(() => {
    if (route.steps && route.steps.length > 0) return route.steps;
    if (route.transitions && route.transitions.length > 0) {
      return route.transitions.map((t, idx) => ({
        stepIndex: idx,
        instruction: t.description,
        distanceMeters: Math.round(route.totalDistanceMeters / route.transitions.length),
        durationSeconds: Math.round(route.estimatedTimeSeconds / route.transitions.length),
        turnType: (t.type === 'elevator' ? 'elevator' : t.type === 'stairs' ? 'stairs' : 'straight') as any,
        floorId: t.fromFloorId,
      }));
    }
    return [{
      stepIndex: 0,
      instruction: 'Follow highlighted path to destination.',
      distanceMeters: route.totalDistanceMeters,
      durationSeconds: route.estimatedTimeSeconds,
      turnType: 'straight' as any,
    }];
  }, [route]);

  const currentStep = steps[currentStepIndex] || steps[0];
  const currentFloorId = currentStep?.floorId || '';

  // Load campus data
  useEffect(() => {
    if (!campusId || !isOpen) return;
    Promise.all([
      campusService.getFloorsByCampus(campusId),
      campusService.getBuildingsByCampus(campusId),
      objectService.getObjectsByCampus(campusId),
    ]).then(([fRes, bRes, oRes]) => {
      if (fRes.success) setFloors(fRes.data);
      if (bRes.success) setBuildings(bRes.data);
      if (oRes.success) setObjects(oRes.data);
      setNodes(navStore.getNodesByCampus(campusId));
      setConnections(navStore.getConnectionsByCampus(campusId));
    });
  }, [campusId, isOpen]);

  // Load shapes for active floor or campus
  useEffect(() => {
    if (!campusId || !isOpen) return;
    let loadedShapes: EditorShape[] = [];

    if (currentFloorId) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`editor-shapes-${campusId}`) && k.endsWith(`-${currentFloorId}`)) {
          try { loadedShapes = JSON.parse(localStorage.getItem(k) || '[]'); } catch {}
          break;
        }
      }
    } else {
      for (const ck of [`editor-shapes-${campusId}`, `editor-shapes-${campusId}--`]) {
        const raw = localStorage.getItem(ck);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) { loadedShapes = parsed; break; }
          } catch {}
        }
      }
    }
    setShapes(loadedShapes);
  }, [campusId, currentFloorId, isOpen]);

  // Speech narration helper
  const speakInstruction = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.min(speed, 1.3);
      utterance.pitch = 1.0;
      utterance.lang = language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch {}
  }, [voiceEnabled, speed, language]);

  // Speak step whenever currentStepIndex changes
  useEffect(() => {
    if (!isOpen || !currentStep) return;
    const cleanText = currentStep.instruction.replace(/\*\*/g, '');
    speakInstruction(`Step ${currentStepIndex + 1}. ${cleanText}`);
  }, [currentStepIndex, isOpen, speakInstruction]);

  // Animation playback timer
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    const stepDuration = Math.max(2500, Math.min(6000, ((currentStep?.durationSeconds || 4) * 1000) / speed));
    const timer = setTimeout(() => {
      setCurrentStepIndex(prev => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, stepDuration);

    return () => clearTimeout(timer);
  }, [isOpen, isPlaying, currentStepIndex, steps.length, speed, currentStep]);

  // Clean speech synthesis on close
  useEffect(() => {
    if (!isOpen && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderTurnIcon = (turnType: RouteStep['turnType']) => {
    switch (turnType) {
      case 'left': case 'slight_left': return <CornerUpLeft size={16} className="text-blue-400" />;
      case 'right': case 'slight_right': return <CornerUpRight size={16} className="text-blue-400" />;
      case 'elevator': case 'stairs': return <Layers size={16} className="text-purple-400" />;
      case 'arrive': return <Check size={16} className="text-emerald-400" />;
      default: return <ArrowUp size={16} className="text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative text-white">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Compass size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Route Video Tutorial & Map Simulation
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Audio voice guided simulation animating along route segments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice Narration Toggle */}
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (voiceEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
              }}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                voiceEnabled
                  ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title={voiceEnabled ? 'Mute Voice Narration' : 'Enable Voice Narration'}
            >
              {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="hidden sm:inline">{voiceEnabled ? 'Voice ON' : 'Muted'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
              title="Close Tutorial"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Center: Map Canvas */}
        <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-950">
          <MapViewer
            objects={objects}
            nodes={nodes}
            connections={connections}
            routeResult={route}
            currentFloorId={currentFloorId}
            shapes={shapes}
            isCampusView={!currentFloorId}
          />

          {/* Subtitle Tutorial Banner: Step Guidance Callout */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 max-w-xl w-[90%] bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white rounded-2xl shadow-2xl p-3.5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
              {renderTurnIcon(currentStep?.turnType)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                <span>Step {currentStepIndex + 1} of {steps.length}</span>
                {currentFloorId && (
                  <span className="text-slate-400">• Level {floors.find(f => f.id === currentFloorId)?.level ?? 0}</span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-100 truncate mt-0.5">
                {currentStep?.instruction}
              </p>
            </div>
            {currentStep?.distanceMeters > 0 && (
              <div className="text-right shrink-0 border-l border-slate-700 pl-3">
                <span className="text-xs font-bold text-slate-200">{currentStep.distanceMeters} m</span>
                <p className="text-[10px] text-slate-400">~{currentStep.durationSeconds}s</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Video Tutorial Controls */}
        <div className="bg-slate-800/95 border-t border-slate-700 px-6 py-4 flex flex-col gap-3 shrink-0">
          {/* Progress Timeline Scrubber */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">
              {String(currentStepIndex + 1).padStart(2, '0')}:{String(steps.length).padStart(2, '0')}
            </span>
            <div className="flex-1 flex gap-1 items-center h-2 bg-slate-700 rounded-full overflow-hidden p-0.5">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-full flex-1 rounded-full cursor-pointer transition-all ${
                    idx === currentStepIndex
                      ? 'bg-blue-500 shadow-md ring-1 ring-blue-300'
                      : idx < currentStepIndex
                      ? 'bg-blue-700'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                  title={`Jump to step ${idx + 1}`}
                />
              ))}
            </div>
            <span className="text-xs font-mono text-slate-400">
              {Math.ceil(route.estimatedTimeSeconds / 60)} min total
            </span>
          </div>

          {/* Buttons: Play, Prev, Next, Speed */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                disabled={currentStepIndex === 0}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                title="Previous Step"
              >
                <SkipBack size={16} />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                <span>{isPlaying ? 'Pause' : currentStepIndex >= steps.length - 1 ? 'Replay' : 'Play Simulation'}</span>
              </button>

              <button
                onClick={() => setCurrentStepIndex(Math.min(steps.length - 1, currentStepIndex + 1))}
                disabled={currentStepIndex >= steps.length - 1}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                title="Next Step"
              >
                <SkipForward size={16} />
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 px-1.5">Speed</span>
              {[1, 1.5, 2].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    speed === s ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
