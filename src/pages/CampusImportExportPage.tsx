import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { campusImportExportService } from '../api/import-export.service';
import { CampusBundle, ValidationResult, ValidationIssue } from '../types/import-export';
import {
  Download, Upload, CheckCircle2, AlertTriangle, XCircle,
  FileJson, ChevronRight, Info, Database, Loader2, FileUp,
} from 'lucide-react';

// ─── Issue Badge ─────────────────────────────────────────────────────────────

const IssueBadge: React.FC<{ issue: ValidationIssue }> = ({ issue }) => {
  const styles = {
    error:   'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info:    'bg-blue-50 border-blue-200 text-blue-700',
  };
  const icons = {
    error:   <XCircle size={13} className="shrink-0" />,
    warning: <AlertTriangle size={13} className="shrink-0" />,
    info:    <Info size={13} className="shrink-0" />,
  };
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${styles[issue.severity]}`}>
      {icons[issue.severity]}
      <div>
        <span className="font-mono font-semibold">[{issue.code}]</span> {issue.message}
        {issue.path && <span className="ml-2 opacity-60 font-mono">← {issue.path}</span>}
      </div>
    </div>
  );
};

// ─── Stats Grid ──────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-sm">
    <div className="text-2xl font-black text-slate-800">{value}</div>
    <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide mt-0.5">{label}</div>
  </div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────

export const CampusImportExportPage: React.FC = () => {
  const { campusId } = useParams<{ campusId: string }>();

  // Export
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Import
  const [importFile, setImportFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [parsedBundle, setParsedBundle] = useState<CampusBundle | null>(null);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importedCampusId, setImportedCampusId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!campusId) return;
    setExporting(true);
    setExportSuccess(false);
    try {
      await campusImportExportService.downloadCampusJson(campusId);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportDone(false);
    setImportError(null);

    const text = await file.text();
    const { bundle, validation: val } = campusImportExportService.parseAndValidate(text);
    setValidation(val);
    setParsedBundle(bundle);
  };

  const handleImport = async () => {
    if (!parsedBundle) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await campusImportExportService.importCampus(parsedBundle, {
        importMode: 'create_new_site',
      });
      if (res.success) {
        setImportDone(true);
        setImportedCampusId(res.campusId);
      } else {
        setImportError(res.message || 'Import failed.');
      }
    } catch (err: any) {
      setImportError(err.message || 'Import encountered an error.');
    } finally {
      setImporting(false);
    }
  };

  const errorCount = validation?.issues.filter(i => i.severity === 'error').length ?? 0;
  const warningCount = validation?.issues.filter(i => i.severity === 'warning').length ?? 0;
  const canImport = validation?.valid && parsedBundle !== null && !importDone;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <nav className="flex items-center gap-1 text-xs text-slate-500 mb-2">
          <Link to="/admin/campuses" className="hover:text-slate-700">Campuses</Link>
          <ChevronRight size={12} />
          {campusId && <Link to={`/admin/campuses/${campusId}`} className="hover:text-slate-700">{campusId}</Link>}
          <ChevronRight size={12} />
          <span className="text-slate-700 font-semibold">Import / Export</span>
        </nav>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
            <FileJson size={18} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Campus Data Import / Export</h1>
            <p className="text-xs text-slate-500">Export the full campus definition as portable JSON. Import and validate a JSON bundle.</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto px-6 py-8 space-y-8">

        {/* ── EXPORT SECTION ────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Download size={16} className="text-blue-600" />
            <h2 className="font-semibold text-slate-800 text-sm">Export Campus</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600">
              Downloads a complete, portable <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">.json</code> bundle containing:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['Campus info', 'Buildings & Floors', 'Objects & Geometry', 'Object Types', 'Nodes', 'Connections', 'Access Rules', 'Metadata'].map(label => (
                <div key={label} className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <Database size={12} className="text-indigo-500 shrink-0" /> {label}
                </div>
              ))}
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-start gap-2">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              No credentials, user accounts, or private authentication data are included in the export.
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-60"
            >
              {exporting
                ? <><Loader2 size={16} className="animate-spin" /> Exporting…</>
                : exportSuccess
                  ? <><CheckCircle2 size={16} /> Exported!</>
                  : <><Download size={16} /> Export to JSON</>
              }
            </button>
          </div>
        </section>

        {/* ── IMPORT SECTION ────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Upload size={16} className="text-emerald-600" />
            <h2 className="font-semibold text-slate-800 text-sm">Import Campus</h2>
          </div>
          <div className="p-6 space-y-5">
            {/* File drop zone */}
            <label
              htmlFor="import-file"
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-8 cursor-pointer transition-colors bg-slate-50 hover:bg-blue-50/30"
            >
              <FileUp size={28} className="text-slate-400" />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">Drop a campus JSON file here, or click to browse</p>
                <p className="text-xs text-slate-500 mt-1">Must be a valid campus bundle (schema version {1})</p>
              </div>
              {importFile && (
                <span className="text-xs font-mono bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-600">
                  📄 {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
              <input
                id="import-file"
                type="file"
                accept=".json,application/json"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
            </label>

            {/* Validation Results */}
            {validation && (
              <div className="space-y-4">
                {/* Summary */}
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                  validation.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                }`}>
                  {validation.valid
                    ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                    : <XCircle size={20} className="text-red-600 shrink-0" />
                  }
                  <div>
                    <p className={`font-semibold text-sm ${validation.valid ? 'text-emerald-800' : 'text-red-800'}`}>
                      {validation.valid ? 'Validation Passed — Ready to Import' : `Validation Failed — ${errorCount} error${errorCount !== 1 ? 's' : ''}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {errorCount} error{errorCount !== 1 ? 's' : ''}, {warningCount} warning{warningCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <StatCard label="Buildings" value={validation.stats.buildings} />
                  <StatCard label="Floors" value={validation.stats.floors} />
                  <StatCard label="Objects" value={validation.stats.objects} />
                  <StatCard label="Types" value={validation.stats.objectTypes} />
                  <StatCard label="Nodes" value={validation.stats.nodes} />
                  <StatCard label="Connections" value={validation.stats.connections} />
                </div>

                {/* Issue list */}
                {validation.issues.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Validation Issues</p>
                    {validation.issues.map((issue, i) => (
                      <IssueBadge key={i} issue={issue} />
                    ))}
                  </div>
                )}

                {/* Import error */}
                {importError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    <strong>Import Error:</strong> {importError}
                  </div>
                )}

                {/* Import success */}
                {importDone && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">Campus imported successfully with full data isolation!</p>
                        <p className="text-xs text-emerald-600 mt-0.5">All buildings, floors, objects, and navigation nodes were created as an independent site.</p>
                      </div>
                    </div>
                    {importedCampusId && (
                      <Link
                        to={`/admin/campuses/${importedCampusId}`}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
                      >
                        Open Imported Site →
                      </Link>
                    )}
                  </div>
                )}

                {/* Import button */}
                {canImport && (
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-60"
                  >
                    {importing
                      ? <><Loader2 size={16} className="animate-spin" /> Importing…</>
                      : <><Upload size={16} /> Import Campus</>
                    }
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};
