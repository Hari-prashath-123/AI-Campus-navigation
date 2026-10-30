import React, { useState } from 'react';
import { EditorShape } from '../../types';
import { SpatialNode, CampusConnection } from '../../types/connection';
import { X, Download, Upload, Copy, Check, FileJson, AlertCircle } from 'lucide-react';

interface MapImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shapes: EditorShape[];
  nodes: SpatialNode[];
  connections: CampusConnection[];
  campusId: string;
  buildingId: string;
  floorId: string;
  onImportData: (data: { shapes?: EditorShape[]; nodes?: SpatialNode[]; connections?: CampusConnection[] }, mode: 'replace' | 'append') => void;
}

export const MapImportExportModal: React.FC<MapImportExportModalProps> = ({
  isOpen,
  onClose,
  shapes,
  nodes,
  connections,
  campusId,
  buildingId,
  floorId,
  onImportData,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<'geojson' | 'json' | 'svg'>('geojson');
  const [copied, setCopied] = useState(false);

  // Import states
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{ shapes: number; nodes: number; connections: number } | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);

  if (!isOpen) return null;

  // Generate Export String
  const generateExportContent = () => {
    if (exportFormat === 'geojson') {
      const features = [
        ...shapes.map(s => ({
          type: 'Feature',
          id: s.id,
          properties: {
            name: s.name,
            geometryType: s.geometryType,
            color: s.color,
            objectTypeId: s.objectTypeId,
            realWorld: s.realWorld,
            attributes: s.attributes,
          },
          geometry: {
            type: s.geometryType === 'polygon' || s.geometryType === 'circle' ? 'Polygon' : s.geometryType === 'polyline' ? 'LineString' : 'Point',
            coordinates: s.geometryType === 'polygon' || s.geometryType === 'circle'
              ? [[[s.x, s.y], [s.x + (s.width || 10), s.y], [s.x + (s.width || 10), s.y + (s.height || 10)], [s.x, s.y + (s.height || 10)], [s.x, s.y]]]
              : s.geometryType === 'polyline'
              ? [[s.points[0], s.points[1]], [s.points[2] || s.points[0], s.points[3] || s.points[1]]]
              : [s.x, s.y],
          },
        })),
        ...nodes.map(n => ({
          type: 'Feature',
          id: n.id,
          properties: {
            type: 'navigation_node',
            nodeType: n.type,
            label: n.label,
            isAccessible: n.isAccessible,
          },
          geometry: {
            type: 'Point',
            coordinates: [n.coordinates.x, n.coordinates.y],
          },
        })),
      ];

      return JSON.stringify({
        type: 'FeatureCollection',
        metadata: {
          campusId,
          buildingId,
          floorId,
          exportedAt: new Date().toISOString(),
          totalFeatures: features.length,
        },
        features,
      }, null, 2);
    }

    if (exportFormat === 'svg') {
      const W = 1600;
      const H = 1000;
      const shapeElements = shapes.map(s => {
        if (s.geometryType === 'polygon') {
          return `<rect x="${s.x}" y="${s.y}" width="${s.width || 10}" height="${s.height || 10}" fill="${s.color}" fill-opacity="0.25" stroke="${s.color}" stroke-width="2" />\n  <text x="${s.x + 5}" y="${s.y + 15}" font-family="sans-serif" font-size="10" fill="${s.color}">${s.name}</text>`;
        }
        if (s.geometryType === 'circle' || s.geometryType === 'ellipse') {
          return `<ellipse cx="${s.x + (s.width || 10)/2}" cy="${s.y + (s.height || 10)/2}" rx="${(s.width || 10)/2}" ry="${(s.height || 10)/2}" fill="${s.color}" fill-opacity="0.25" stroke="${s.color}" stroke-width="2" />`;
        }
        return '';
      }).join('\n  ');

      const nodeElements = nodes.map(n => 
        `<circle cx="${n.coordinates.x}" cy="${n.coordinates.y}" r="6" fill="#3b82f6" stroke="#ffffff" stroke-width="2" />`
      ).join('\n  ');

      return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
  <!-- Exported Map Floor ${floorId} -->
  ${shapeElements}
  ${nodeElements}
</svg>`;
    }

    // Default JSON bundle
    return JSON.stringify({
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      campusId,
      buildingId,
      floorId,
      shapes,
      nodes,
      connections,
    }, null, 2);
  };

  const handleDownload = () => {
    const content = generateExportContent();
    const ext = exportFormat === 'geojson' ? 'geojson' : exportFormat === 'svg' ? 'svg' : 'json';
    const blob = new Blob([content], { type: exportFormat === 'svg' ? 'image/svg+xml' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floor-map-${floorId || 'export'}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateExportContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Import parsing
  const handleParseImport = (text: string) => {
    setImportText(text);
    setImportError(null);
    setImportPreview(null);
    setParsedData(null);

    if (!text.trim()) return;

    try {
      const parsed = JSON.parse(text);
      let foundShapes: EditorShape[] = [];
      let foundNodes: SpatialNode[] = [];
      let foundConnections: CampusConnection[] = [];

      // Check if GeoJSON FeatureCollection
      if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
        parsed.features.forEach((f: any) => {
          if (f.properties?.type === 'navigation_node') {
            foundNodes.push({
              id: f.id || `node_${Date.now()}_${Math.random()}`,
              campusId,
              buildingId,
              floorId,
              type: f.properties?.nodeType || 'hallway',
              coordinates: { x: f.geometry?.coordinates?.[0] || 0, y: f.geometry?.coordinates?.[1] || 0 },
              isAccessible: f.properties?.isAccessible ?? true,
              label: f.properties?.label,
            });
          } else {
            const coords = f.geometry?.coordinates;
            let x = 100, y = 100, width = 60, height = 40;
            if (f.geometry?.type === 'Polygon' && coords?.[0]?.length >= 4) {
              x = coords[0][0][0];
              y = coords[0][0][1];
              width = Math.abs((coords[0][1]?.[0] || x + 60) - x);
              height = Math.abs((coords[0][2]?.[1] || y + 40) - y);
            } else if (f.geometry?.type === 'Point') {
              x = coords[0];
              y = coords[1];
            }

            foundShapes.push({
              id: f.id || `shape_${Date.now()}_${Math.random()}`,
              objectTypeId: f.properties?.objectTypeId || 'generic',
              geometryType: f.properties?.geometryType || 'polygon',
              points: [x, y, x + width, y + height],
              x,
              y,
              width,
              height,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              name: f.properties?.name || 'Imported Room',
              color: f.properties?.color || '#3b82f6',
              attributes: f.properties?.attributes,
              realWorld: f.properties?.realWorld,
            });
          }
        });
      } else if (Array.isArray(parsed.shapes)) {
        // Direct Map JSON bundle
        foundShapes = parsed.shapes || [];
        foundNodes = parsed.nodes || [];
        foundConnections = parsed.connections || [];
      } else if (Array.isArray(parsed)) {
        // Direct array of shapes
        foundShapes = parsed;
      }

      setParsedData({ shapes: foundShapes, nodes: foundNodes, connections: foundConnections });
      setImportPreview({
        shapes: foundShapes.length,
        nodes: foundNodes.length,
        connections: foundConnections.length,
      });
    } catch (err: any) {
      setImportError('Invalid JSON format: ' + err.message);
    }
  };

  const handleExecuteImport = () => {
    if (!parsedData) return;
    onImportData(parsedData, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileJson size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900 text-base">Import & Export Map Geometry</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200">
            <X size={16} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download size={14} /> Export Map
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload size={14} /> Import Map
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'export' ? (
            <>
              {/* Format selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-2">Export Format</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setExportFormat('geojson')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      exportFormat === 'geojson'
                        ? 'border-blue-500 bg-blue-50 text-blue-800 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block text-xs">GeoJSON (.geojson)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Standard GIS FeatureCollection</span>
                  </button>
                  <button
                    onClick={() => setExportFormat('json')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      exportFormat === 'json'
                        ? 'border-blue-500 bg-blue-50 text-blue-800 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block text-xs">Map Bundle (.json)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Shapes, nodes, & paths</span>
                  </button>
                  <button
                    onClick={() => setExportFormat('svg')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      exportFormat === 'svg'
                        ? 'border-blue-500 bg-blue-50 text-blue-800 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block text-xs">Vector Graphic (.svg)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Printable 2D floor plan</span>
                  </button>
                </div>
              </div>

              {/* Data Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-slate-600">
                <span>Export contents: <strong>{shapes.length}</strong> rooms/objects, <strong>{nodes.length}</strong> waypoints, <strong>{connections.length}</strong> paths</span>
              </div>

              {/* Code Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Preview</label>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono h-48 overflow-y-auto overflow-x-auto">
                  {generateExportContent()}
                </pre>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg"
                >
                  Close
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={14} /> Download File
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Import Tab */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700">Import Geometry File or Text</label>
                  <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Upload size={13} />
                    <span>Upload JSON/GeoJSON</span>
                    <input
                      type="file"
                      accept=".json,.geojson,application/json"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => {
                          const content = ev.target?.result as string;
                          if (content) handleParseImport(content);
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                </div>
                <textarea
                  rows={7}
                  placeholder="Paste your GeoJSON FeatureCollection or Map Bundle JSON here, or click 'Upload JSON/GeoJSON' above..."
                  value={importText}
                  onChange={e => handleParseImport(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{importError}</span>
                </div>
              )}

              {importPreview && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg space-y-1">
                  <span className="font-bold block">Valid Map Data Detected:</span>
                  <div className="flex gap-4 text-xs font-medium">
                    <span>{importPreview.shapes} Rooms / Shapes</span>
                    <span>{importPreview.nodes} Navigation Nodes</span>
                    <span>{importPreview.connections} Paths</span>
                  </div>
                </div>
              )}

              {/* Import Mode */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Import Destination Mode</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer flex-1">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-blue-600"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">Append to Current Floor</span>
                      <span className="text-[10px] text-slate-500">Keep existing geometry and add new items</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer flex-1">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-blue-600"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">Replace Current Floor</span>
                      <span className="text-[10px] text-slate-500">Clear existing floor objects before importing</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  disabled={!parsedData}
                  onClick={handleExecuteImport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Upload size={14} /> Import to Map
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
