import React from 'react';
import { GraphValidationReport, GraphValidationError } from '../../utils/graph-validation';
import { AlertTriangle, CheckCircle2, AlertCircle, ChevronRight, X, Sparkles } from 'lucide-react';

interface ValidationPanelProps {
  report: GraphValidationReport;
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity?: (entityId: string, category: string) => void;
  onRebuildGraph?: () => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  report,
  isOpen,
  onClose,
  onSelectEntity,
  onRebuildGraph,
}) => {
  if (!isOpen) return null;

  const allIssues = [...report.errors, ...report.warnings];

  return (
    <div className="absolute top-14 right-4 z-30 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[500px] animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {report.isValid && allIssues.length === 0 ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : report.errors.length > 0 ? (
            <AlertCircle size={16} className="text-red-600" />
          ) : (
            <AlertTriangle size={16} className="text-amber-500" />
          )}
          <span className="text-xs font-bold text-slate-800">Campus Graph Validation</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5 rounded hover:bg-slate-200"
        >
          <X size={14} />
        </button>
      </div>

      {/* Stats summary bar */}
      <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="bg-white p-1 rounded border border-slate-200">
          <div className="font-bold text-slate-700">{report.totalNodes}</div>
          <div className="text-slate-400">Nodes</div>
        </div>
        <div className="bg-white p-1 rounded border border-slate-200">
          <div className="font-bold text-slate-700">{report.totalEdges}</div>
          <div className="text-slate-400">Paths</div>
        </div>
        <div className="bg-white p-1 rounded border border-slate-200">
          <div className={`font-bold ${allIssues.length === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {allIssues.length}
          </div>
          <div className="text-slate-400">Issues</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {allIssues.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-80" />
            <p className="text-xs font-semibold text-slate-700">Network is Healthy</p>
            <p className="text-[11px] text-slate-400 mt-1">All nodes, edges, and room doors are properly connected and routable.</p>
          </div>
        ) : (
          allIssues.map((issue: GraphValidationError) => {
            const isError = issue.type === 'error';
            return (
              <div
                key={issue.id}
                onClick={() => onSelectEntity?.(issue.entityId, issue.category)}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all hover:shadow-sm ${
                  isError
                    ? 'bg-red-50/70 border-red-200 hover:bg-red-50'
                    : 'bg-amber-50/70 border-amber-200 hover:bg-amber-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  {isError ? (
                    <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-800 truncate">{issue.title}</h4>
                      <span className="text-[10px] uppercase font-mono px-1 rounded bg-white/70 border border-slate-200 text-slate-500">
                        {issue.subType ? issue.subType.replace('_', ' ') : issue.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{issue.description}</p>
                  </div>
                  <ChevronRight size={13} className="text-slate-400 shrink-0 self-center" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {onRebuildGraph && (
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onRebuildGraph}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors"
            title="Convert drawn walkable paths, doors, and rooms into clean navigation nodes & edges"
          >
            <Sparkles size={14} />
            <span>Generate & Clean Graph</span>
          </button>
        </div>
      )}
    </div>
  );
};
