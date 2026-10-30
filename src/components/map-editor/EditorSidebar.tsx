import React, { useEffect, useState, useRef } from 'react';
import { EditorShape, ObjectType, PropertyDefinition, MapCalibration, formatArea, Floor, Building, Campus, FloorOverlayConfig } from '../../types';
import { SpatialNode, CampusConnection, SpatialNodeType, ConnectionType } from '../../types/connection';
import { Input } from '../ui/Input';
import {
  Layers, Loader2, Ruler, Copy, X, Trash2, MapPin, GitBranch,
  DoorOpen, Image, Upload, RotateCcw, Maximize2,
  AlignLeft, AlignCenter, AlignRight,
  ShieldCheck, Check
} from 'lucide-react';
import { objectTypeService } from '../../api/object-type.service';
import { Button } from '../ui/Button';

interface EditorSidebarProps {
  selectedShapes: EditorShape[];
  updateShape: (id: string, updates: Partial<EditorShape>) => void;
  onDuplicate: () => void;
  onBulkDelete?: () => void;
  onBulkAlign?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  calibration: MapCalibration;
  // Node & Edge selection support
  selectedNode?: SpatialNode | null;
  selectedEdge?: CampusConnection | null;
  onUpdateNode?: (id: string, patch: Partial<SpatialNode>) => void;
  onDeleteNode?: (id: string) => void;
  onUpdateEdge?: (id: string, patch: Partial<CampusConnection>) => void;
  onDeleteEdge?: (id: string) => void;
  availableNodes?: SpatialNode[];
  // Floor & Reference Image props
  activeFloor?: Floor | null;
  activeBuilding?: Building | null;
  activeCampus?: Campus | null;
  onUpdateFloorOverlay?: (overlay: FloorOverlayConfig, planImageUrl?: string) => void;
  onFitToView?: () => void;
  totalStats?: {
    shapesCount: number;
    nodesCount: number;
    edgesCount: number;
  };
  /** Called when the user clicks the ✕ / close button inside the sidebar */
  onClose?: () => void;
}

const NODE_TYPES: { value: SpatialNodeType; label: string }[] = [
  { value: 'hallway', label: 'Hallway / Corridor' },
  { value: 'door', label: 'Room Door' },
  { value: 'stairs', label: 'Staircase' },
  { value: 'elevator', label: 'Elevator' },
  { value: 'entrance', label: 'Building Entrance' },
  { value: 'ramp', label: 'Accessible Ramp' },
  { value: 'bridge', label: 'Bridge / Skywalk' },
  { value: 'outdoor_waypoint', label: 'Outdoor Waypoint' },
];

const CONNECTION_TYPES: { value: ConnectionType; label: string }[] = [
  { value: 'corridor', label: 'Corridor / Hallway' },
  { value: 'door', label: 'Door Transition' },
  { value: 'staircase', label: 'Staircase' },
  { value: 'elevator', label: 'Elevator Shaft' },
  { value: 'ramp', label: 'Ramp' },
  { value: 'bridge', label: 'Skybridge' },
  { value: 'entrance', label: 'Building Entrance' },
  { value: 'building_to_building', label: 'Campus Pathway' },
];

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  selectedShapes,
  updateShape,
  onDuplicate,
  onBulkDelete,
  onBulkAlign,
  calibration,
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge,
  availableNodes = [],
  activeFloor,
  activeBuilding,
  activeCampus,
  onUpdateFloorOverlay,
  onFitToView,
  totalStats,
  onClose,
}) => {
  const [typeDef, setTypeDef] = useState<ObjectType | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for floor reference overlay configuration
  const [refImageUrl, setRefImageUrl] = useState<string>(activeFloor?.planImageUrl || '');
  const [refOpacity, setRefOpacity] = useState<number>(activeFloor?.overlayConfig?.opacity ?? 0.65);
  const [refScale, setRefScale] = useState<number>(activeFloor?.overlayConfig?.scaleX ?? 1);
  const [refOffsetX, setRefOffsetX] = useState<number>(activeFloor?.overlayConfig?.offsetX ?? 0);
  const [refOffsetY, setRefOffsetY] = useState<number>(activeFloor?.overlayConfig?.offsetY ?? 0);
  const [refRotation, setRefRotation] = useState<number>(activeFloor?.overlayConfig?.rotationDegrees ?? 0);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  // Sync when floor changes
  useEffect(() => {
    if (activeFloor) {
      setRefImageUrl(activeFloor.planImageUrl || '');
      setRefOpacity(activeFloor.overlayConfig?.opacity ?? 0.65);
      setRefScale(activeFloor.overlayConfig?.scaleX ?? 1);
      setRefOffsetX(activeFloor.overlayConfig?.offsetX ?? 0);
      setRefOffsetY(activeFloor.overlayConfig?.offsetY ?? 0);
      setRefRotation(activeFloor.overlayConfig?.rotationDegrees ?? 0);
    }
  }, [activeFloor?.id, activeFloor?.planImageUrl]);

  const shape = selectedShapes.length === 1 ? selectedShapes[0] : null;

  useEffect(() => {
    if (shape && shape.objectTypeId && shape.objectTypeId !== 'generic') {
      const loadType = async () => {
        setLoading(true);
        const res = await objectTypeService.getById(shape.objectTypeId);
        if (res.success) setTypeDef(res.data);
        else setTypeDef(null);
        setLoading(false);
      };
      loadType();
    } else {
      setTypeDef(null);
    }
  }, [shape?.objectTypeId]);

  const closeSidebar = () => onClose?.();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setRefImageUrl(dataUrl);
      const newOverlay: FloorOverlayConfig = {
        opacity: refOpacity,
        scaleX: refScale,
        scaleY: refScale,
        offsetX: refOffsetX,
        offsetY: refOffsetY,
        rotationDegrees: refRotation,
      };
      onUpdateFloorOverlay?.(newOverlay, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyOverlayChange = (partial: Partial<FloorOverlayConfig>, newUrl?: string) => {
    const nextOverlay: FloorOverlayConfig = {
      opacity: partial.opacity ?? refOpacity,
      scaleX: partial.scaleX ?? refScale,
      scaleY: partial.scaleY ?? refScale,
      offsetX: partial.offsetX ?? refOffsetX,
      offsetY: partial.offsetY ?? refOffsetY,
      rotationDegrees: partial.rotationDegrees ?? refRotation,
    };
    if (partial.opacity !== undefined) setRefOpacity(partial.opacity);
    if (partial.scaleX !== undefined) setRefScale(partial.scaleX);
    if (partial.offsetX !== undefined) setRefOffsetX(partial.offsetX);
    if (partial.offsetY !== undefined) setRefOffsetY(partial.offsetY);
    if (partial.rotationDegrees !== undefined) setRefRotation(partial.rotationDegrees);

    onUpdateFloorOverlay?.(nextOverlay, newUrl ?? refImageUrl);
  };

  const handleSaveFloorConfig = () => {
    const config: FloorOverlayConfig = {
      opacity: refOpacity,
      scaleX: refScale,
      scaleY: refScale,
      offsetX: refOffsetX,
      offsetY: refOffsetY,
      rotationDegrees: refRotation,
    };
    onUpdateFloorOverlay?.(config, refImageUrl);
    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 2000);
  };

  // ── 1. SELECTED NODE INSPECTOR ──────────────────────────────────────────────
  if (selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-sm z-10">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <MapPin size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm truncate max-w-[140px]">
                {selectedNode.label || 'Navigation Node'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono capitalize">{selectedNode.type}</p>
            </div>
          </div>
          <div className="flex gap-1">
            {onDeleteNode && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => onDeleteNode(selectedNode.id)}
                title="Delete Node"
              >
                <Trash2 size={14} />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={closeSidebar} title="Close Panel">
              <X size={14} />
            </Button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Waypoint Label</label>
            <input
              type="text"
              value={selectedNode.label || ''}
              onChange={e => onUpdateNode?.(selectedNode.id, { label: e.target.value })}
              placeholder="e.g. Corridor Intersection 3"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Node Type</label>
            <select
              value={selectedNode.type}
              onChange={e => onUpdateNode?.(selectedNode.id, { type: e.target.value as SpatialNodeType })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              {NODE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <span className="font-semibold text-slate-700 block">Canvas Position</span>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600">
              <div>X: <strong>{Math.round(selectedNode.coordinates.x)} px</strong></div>
              <div>Y: <strong>{Math.round(selectedNode.coordinates.y)} px</strong></div>
            </div>
          </div>

          <label className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
            <input
              type="checkbox"
              checked={selectedNode.isAccessible}
              onChange={e => onUpdateNode?.(selectedNode.id, { isAccessible: e.target.checked })}
              className="rounded border-slate-300 text-blue-600"
            />
            <span className="font-medium text-slate-800">Wheelchair Accessible</span>
          </label>
        </div>
      </div>
    );
  }

  // ── 2. SELECTED CONNECTION (EDGE) INSPECTOR ─────────────────────────────────
  if (selectedEdge) {
    return (
      <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-sm z-10">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <GitBranch size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm truncate max-w-[140px]">
                {selectedEdge.name || 'Campus Path'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono capitalize">{selectedEdge.connectionType}</p>
            </div>
          </div>
          <div className="flex gap-1">
            {onDeleteEdge && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => onDeleteEdge(selectedEdge.id)}
                title="Delete Connection"
              >
                <Trash2 size={14} />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={closeSidebar} title="Close Panel">
              <X size={14} />
            </Button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Path Name</label>
            <input
              type="text"
              value={selectedEdge.name || ''}
              onChange={e => onUpdateEdge?.(selectedEdge.id, { name: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Connection Type</label>
            <select
              value={selectedEdge.connectionType}
              onChange={e => onUpdateEdge?.(selectedEdge.id, { connectionType: e.target.value as ConnectionType })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              {CONNECTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Distance (meters)</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={selectedEdge.distanceMeters}
                onChange={e => onUpdateEdge?.(selectedEdge.id, { distanceMeters: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Weight Cost</label>
              <input
                type="number"
                min="0.5"
                step="0.1"
                value={selectedEdge.weightMultiplier}
                onChange={e => onUpdateEdge?.(selectedEdge.id, { weightMultiplier: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
              <input
                type="checkbox"
                checked={selectedEdge.isBidirectional}
                onChange={e => onUpdateEdge?.(selectedEdge.id, { isBidirectional: e.target.checked })}
                className="rounded border-slate-300 text-blue-600"
              />
              <span className="font-medium text-slate-800">Bidirectional Traversal</span>
            </label>

            <label className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
              <input
                type="checkbox"
                checked={selectedEdge.isAccessible}
                onChange={e => onUpdateEdge?.(selectedEdge.id, { isAccessible: e.target.checked })}
                className="rounded border-slate-300 text-blue-600"
              />
              <span className="font-medium text-slate-800">Wheelchair Accessible</span>
            </label>

            <label className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
              <input
                type="checkbox"
                checked={selectedEdge.isWalkable}
                onChange={e => onUpdateEdge?.(selectedEdge.id, { isWalkable: e.target.checked })}
                className="rounded border-slate-300 text-blue-600"
              />
              <span className="font-medium text-slate-800">Pedestrian Walkable</span>
            </label>

            <label className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
              <input
                type="checkbox"
                checked={Boolean(selectedEdge.isRestricted)}
                onChange={e => onUpdateEdge?.(selectedEdge.id, { isRestricted: e.target.checked })}
                className="rounded border-slate-300 text-amber-600"
              />
              <span className="font-medium text-slate-800">Restricted / Staff Access Only</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. MULTI-SELECTION STATE ────────────────────────────────────────────────
  if (selectedShapes.length > 1) {
    const totalAreaM2 = selectedShapes.reduce((acc, s) => acc + (s.realWorld?.areaM2 || 0), 0);

    return (
      <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-sm z-10">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Multiple Objects</h3>
            <p className="text-xs text-blue-600 font-medium">{selectedShapes.length} shapes selected</p>
          </div>
          <Button variant="ghost" size="sm" onClick={closeSidebar} title="Close Panel">
            <X size={14} />
          </Button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-5 text-xs">
          
          {/* Summary */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
            <span className="text-slate-600 font-medium block">Total Area</span>
            <span className="font-bold text-blue-900 text-sm font-mono">
              {formatArea(totalAreaM2, calibration.unitSystem)}
            </span>
          </div>

          {/* Bulk Alignment Tools */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2">Align Objects</label>
            {/* Horizontal alignment */}
            <div className="grid grid-cols-3 gap-1.5 mb-1.5">
              <button
                onClick={() => onBulkAlign?.('left')}
                className="flex items-center justify-center gap-1 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md font-medium text-slate-700"
                title="Align Left edges"
              >
                <AlignLeft size={14} /> Left
              </button>
              <button
                onClick={() => onBulkAlign?.('center')}
                className="flex items-center justify-center gap-1 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md font-medium text-slate-700"
                title="Align horizontal centres"
              >
                <AlignCenter size={14} /> Center
              </button>
              <button
                onClick={() => onBulkAlign?.('right')}
                className="flex items-center justify-center gap-1 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md font-medium text-slate-700"
                title="Align Right edges"
              >
                <AlignRight size={14} /> Right
              </button>
            </div>
            {/* Vertical alignment */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onBulkAlign?.('top')}
                className="flex items-center justify-center gap-1 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md font-medium text-slate-700"
                title="Align Top edges"
              >
                <AlignLeft size={14} className="rotate-90" /> Top
              </button>
              <button
                onClick={() => onBulkAlign?.('middle')}
                className="flex items-center justify-center gap-1 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md font-medium text-slate-700"
                title="Align vertical midpoints"
              >
                <AlignCenter size={14} className="rotate-90" /> Middle
              </button>
              <button
                onClick={() => onBulkAlign?.('bottom')}
                className="flex items-center justify-center gap-1 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md font-medium text-slate-700"
                title="Align Bottom edges"
              >
                <AlignRight size={14} className="rotate-90" /> Bottom
              </button>
            </div>
          </div>

          {/* Bulk Operations */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              onClick={onDuplicate}
              className="w-full flex items-center justify-center gap-2 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg transition-colors"
            >
              <Copy size={14} /> Duplicate Selected ({selectedShapes.length})
            </button>
            <button
              onClick={onBulkDelete}
              className="w-full flex items-center justify-center gap-2 p-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg transition-colors border border-red-200"
            >
              <Trash2 size={14} /> Delete Selected ({selectedShapes.length})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 4. SINGLE SHAPE SELECTED ────────────────────────────────────────────────
  if (shape) {
    const handleAttributeChange = (key: string, value: any) => {
      const updatedAttributes = { ...(shape.attributes || {}), [key]: value };
      updateShape(shape.id, { attributes: updatedAttributes });
    };

    return (
      <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-sm z-10">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Colour swatch – click to open native colour picker */}
            <div className="relative w-8 h-8 rounded bg-slate-100 flex items-center justify-center cursor-pointer" title="Click to change shape colour">
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: shape.color }}></div>
              <input
                type="color"
                value={shape.color || '#3b82f6'}
                onChange={e => updateShape(shape.id, { color: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded"
                title="Shape colour"
              />
            </div>
            <div>
              <h3 className="font-outfit font-semibold text-slate-900 truncate max-w-[150px]">{shape.name}</h3>
              <p className="text-xs text-slate-500 font-mono">{typeDef ? typeDef.name : shape.objectTypeId} • {shape.geometryType}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={closeSidebar} title="Close Panel">
              <X size={14} />
            </Button>
            <Button variant="outline" size="sm" onClick={onDuplicate} title="Duplicate">
              <Copy size={14} />
            </Button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-5 text-xs">
          
          {/* Core Properties */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Core Identity</h4>
            <Input 
              label="Display Name" 
              value={shape.name} 
              onChange={e => updateShape(shape.id, { name: e.target.value })}
            />

            {/* Associated Navigation Door / Node */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <DoorOpen size={14} className="text-amber-600" />
                  Primary Entrance Door
                </span>
              </div>
              <select
                value={shape.attributes?.associatedNodeId || ''}
                onChange={e => {
                  const val = e.target.value;
                  const currentList = shape.attributes?.entranceNodeIds || [];
                  const updatedList = val ? Array.from(new Set([val, ...currentList])) : currentList;
                  handleAttributeChange('associatedNodeId', val);
                  handleAttributeChange('entranceNodeIds', updatedList);
                }}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
              >
                <option value="">No door assigned (unconnected)</option>
                {availableNodes.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.label || `${n.type} (${Math.round(n.coordinates.x)}, ${Math.round(n.coordinates.y)})`}
                  </option>
                ))}
              </select>

              {/* Multiple Entrances Multi-Select Checkboxes */}
              {availableNodes.filter(n => n.type === 'door' || n.type === 'entrance').length > 1 && (
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-600 block">All Room Entrances</span>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                    {availableNodes.filter(n => n.type === 'door' || n.type === 'entrance').map(dn => {
                      const isChecked = (shape.attributes?.entranceNodeIds || []).includes(dn.id) || shape.attributes?.associatedNodeId === dn.id;
                      return (
                        <label key={dn.id} className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              const prevIds: string[] = shape.attributes?.entranceNodeIds || (shape.attributes?.associatedNodeId ? [shape.attributes.associatedNodeId] : []);
                              const newIds = e.target.checked
                                ? Array.from(new Set([...prevIds, dn.id]))
                                : prevIds.filter(id => id !== dn.id);
                              handleAttributeChange('entranceNodeIds', newIds);
                              if (!newIds.includes(shape.attributes?.associatedNodeId)) {
                                handleAttributeChange('associatedNodeId', newIds[0] || '');
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <span className="truncate">{dn.label || `${dn.type} (${Math.round(dn.coordinates.x)}, ${Math.round(dn.coordinates.y)})`}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-slate-400">
                Associates room with one or more door waypoints for multi-entrance routing.
              </p>
            </div>
          </div>

          {/* Dynamic Properties from ObjectType */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex justify-between">
              <span>{typeDef ? typeDef.name : 'Dynamic'} Properties</span>
              {loading && <Loader2 size={12} className="animate-spin text-blue-500" />}
            </h4>
            
            {!typeDef && !loading && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500">
                Generic room shape.
              </div>
            )}

            {typeDef && typeDef.propertyDefinitions.length === 0 && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500">
                This object type has no custom properties.
              </div>
            )}

            {typeDef && typeDef.propertyDefinitions.map(prop => (
              <DynamicField 
                key={prop.id} 
                prop={prop} 
                value={shape.attributes?.[prop.key]}
                onChange={(val) => handleAttributeChange(prop.key, val)}
              />
            ))}
          </div>

          {/* Real-World Geometry */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Ruler size={13} />
              Authoritative Geometry
            </h4>

            {shape.realWorld ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    label={`Origin X (${calibration.unitSystem === 'imperial' ? 'ft' : 'm'})`}
                    type="number" 
                    step="0.1"
                    value={calibration.unitSystem === 'imperial' ? (shape.realWorld.originXMeters * 3.28084).toFixed(1) : shape.realWorld.originXMeters.toFixed(1)} 
                    onChange={e => {
                      const val = Number(e.target.value);
                      const meters = calibration.unitSystem === 'imperial' ? val / 3.28084 : val;
                      updateShape(shape.id, { 
                        x: meters * (calibration.canvasWidthPx / calibration.realWidthMeters),
                      });
                    }}
                  />
                  <Input 
                    label={`Origin Y (${calibration.unitSystem === 'imperial' ? 'ft' : 'm'})`}
                    type="number" 
                    step="0.1"
                    value={calibration.unitSystem === 'imperial' ? (shape.realWorld.originYMeters * 3.28084).toFixed(1) : shape.realWorld.originYMeters.toFixed(1)} 
                    onChange={e => {
                      const val = Number(e.target.value);
                      const meters = calibration.unitSystem === 'imperial' ? val / 3.28084 : val;
                      updateShape(shape.id, { 
                        y: meters * (calibration.canvasHeightPx / calibration.realHeightMeters),
                      });
                    }}
                  />
                </div>

                {(shape.geometryType === 'polygon' || shape.width !== undefined) && shape.realWorld.widthMeters !== undefined && shape.realWorld.heightMeters !== undefined && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      label={`Width (${calibration.unitSystem === 'imperial' ? 'ft' : 'm'})`}
                      type="number" 
                      step="0.1"
                      value={calibration.unitSystem === 'imperial' ? (shape.realWorld.widthMeters * 3.28084).toFixed(1) : shape.realWorld.widthMeters.toFixed(1)} 
                      onChange={e => {
                        const val = Number(e.target.value);
                        const meters = calibration.unitSystem === 'imperial' ? val / 3.28084 : val;
                        updateShape(shape.id, { 
                          width: meters * (calibration.canvasWidthPx / calibration.realWidthMeters),
                        });
                      }}
                    />
                    <Input 
                      label={`Height (${calibration.unitSystem === 'imperial' ? 'ft' : 'm'})`}
                      type="number" 
                      step="0.1"
                      value={calibration.unitSystem === 'imperial' ? (shape.realWorld.heightMeters * 3.28084).toFixed(1) : shape.realWorld.heightMeters.toFixed(1)} 
                      onChange={e => {
                        const val = Number(e.target.value);
                        const meters = calibration.unitSystem === 'imperial' ? val / 3.28084 : val;
                        updateShape(shape.id, { 
                          height: meters * (calibration.canvasHeightPx / calibration.realHeightMeters),
                        });
                      }}
                    />
                  </div>
                )}
                
                {shape.realWorld.areaM2 !== undefined && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Calculated Area</span>
                    <span className="font-bold text-slate-900 font-mono">{formatArea(shape.realWorld.areaM2, calibration.unitSystem)}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-slate-400 italic">Measurements calculating...</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── 5. DEFAULT STATE (CANVAS & FLOOR PROPERTIES + REFERENCE IMAGE LAYER) ────
  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-sm z-10">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-blue-600" />
          <h3 className="font-semibold text-slate-900 text-sm">Floor & Reference</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={closeSidebar} title="Close Panel">
          <X size={14} />
        </Button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-5 text-xs">
        
        {/* Floor Context Information */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">
              {activeFloor ? (typeof activeFloor.name === 'string' ? activeFloor.name : activeFloor.name.en || activeFloor.code) : 'Current Floor'}
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded text-[10px]">
              Level {activeFloor?.level ?? 0}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {activeBuilding ? (typeof activeBuilding.name === 'string' ? activeBuilding.name : activeBuilding.name.en) : 'Building'} • {activeCampus ? (typeof activeCampus.name === 'string' ? activeCampus.name : activeCampus.name.en) : 'Campus'}
          </p>

          <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-1 text-center font-mono">
            <div className="p-1 bg-white rounded border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Rooms</span>
              <strong className="text-slate-800">{totalStats?.shapesCount ?? 0}</strong>
            </div>
            <div className="p-1 bg-white rounded border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Nodes</span>
              <strong className="text-slate-800">{totalStats?.nodesCount ?? 0}</strong>
            </div>
            <div className="p-1 bg-white rounded border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Paths</span>
              <strong className="text-slate-800">{totalStats?.edgesCount ?? 0}</strong>
            </div>
          </div>

          <div className="pt-1">
            <button
              onClick={onFitToView}
              className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-blue-700 font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Maximize2 size={13} /> Fit All Content to View (F)
            </button>
          </div>
        </div>

        {/* Reference Floor-Plan Image Layer Controls */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Image size={13} className="text-indigo-600" />
              Reference Blueprint Image
            </h4>
            {refImageUrl && (
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <Check size={11} /> Loaded
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Upload an architectural floor plan or CAD drawing as a non-authoritative reference layer to trace rooms, corridors, and doors over it.
          </p>

          {/* Upload Button & URL input */}
          <div className="space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Upload size={14} /> Upload Floor Plan Image
            </button>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 block">Or Image URL</label>
              <input
                type="text"
                placeholder="https://.../floorplan.png"
                value={refImageUrl}
                onChange={e => {
                  setRefImageUrl(e.target.value);
                  handleApplyOverlayChange({}, e.target.value);
                }}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {refImageUrl && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              
              {/* Opacity Slider */}
              <div>
                <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                  <span>Tracing Opacity</span>
                  <span className="font-mono">{Math.round(refOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={refOpacity}
                  onChange={e => handleApplyOverlayChange({ opacity: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Scale Slider */}
              <div>
                <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                  <span>Image Scale</span>
                  <span className="font-mono">{Math.round(refScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.05"
                  value={refScale}
                  onChange={e => {
                    const sc = parseFloat(e.target.value);
                    handleApplyOverlayChange({ scaleX: sc, scaleY: sc });
                  }}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Offset X & Offset Y */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-1">Offset X (px)</label>
                  <input
                    type="number"
                    step="5"
                    value={refOffsetX}
                    onChange={e => handleApplyOverlayChange({ offsetX: Number(e.target.value) })}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-1">Offset Y (px)</label>
                  <input
                    type="number"
                    step="5"
                    value={refOffsetY}
                    onChange={e => handleApplyOverlayChange({ offsetY: Number(e.target.value) })}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>

              {/* Rotation */}
              <div>
                <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                  <span>Rotation</span>
                  <span className="font-mono">{Math.round(refRotation)}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={refRotation}
                  onChange={e => handleApplyOverlayChange({ rotationDegrees: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    handleApplyOverlayChange({ offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotationDegrees: 0, opacity: 0.65 });
                  }}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-[11px] flex items-center justify-center gap-1 transition-colors"
                >
                  <RotateCcw size={12} /> Reset
                </button>
                <button
                  onClick={() => {
                    setRefImageUrl('');
                    onUpdateFloorOverlay?.({ opacity: 0.65, scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, rotationDegrees: 0 }, '');
                  }}
                  className="py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-600 rounded font-medium text-[11px] transition-colors"
                >
                  Remove
                </button>
              </div>

              {/* Save Blueprint to Floor */}
              <button
                onClick={handleSaveFloorConfig}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                {isSavedFeedback ? <Check size={14} /> : <ShieldCheck size={14} />}
                {isSavedFeedback ? 'Saved to Floor!' : 'Save Reference Settings'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for dynamic fields
const DynamicField: React.FC<{ prop: PropertyDefinition; value: any; onChange: (val: any) => void }> = ({ prop, value, onChange }) => {
  switch (prop.type) {
    case 'boolean':
      return (
        <label className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer shadow-sm hover:border-blue-300">
          <input 
            type="checkbox" 
            className="w-4 h-4 text-blue-600 rounded" 
            checked={!!value}
            onChange={e => onChange(e.target.checked)} 
          />
          <div>
            <span className="text-xs font-medium text-slate-900">{prop.label} {prop.required && '*'}</span>
            {prop.description && <p className="text-[10px] text-slate-500">{prop.description}</p>}
          </div>
        </label>
      );
    
    case 'select':
      return (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">{prop.label} {prop.required && '*'}</label>
          <select 
            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          >
            <option value="">{prop.placeholder || 'Select option...'}</option>
            {prop.options?.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      );

    case 'number':
      return (
        <div className="relative">
          <Input 
            label={`${prop.label} ${prop.required ? '*' : ''}`}
            type="number" 
            value={value || ''} 
            onChange={e => onChange(Number(e.target.value))}
            placeholder={prop.placeholder}
            className={prop.unit ? "pr-10" : ""}
          />
          {prop.unit && (
            <span className="absolute right-3 top-[26px] text-xs text-slate-400 font-medium">{prop.unit}</span>
          )}
        </div>
      );
      
    case 'text':
      return (
        <Input 
          label={`${prop.label} ${prop.required ? '*' : ''}`}
          value={value || ''} 
          onChange={e => onChange(e.target.value)}
          placeholder={prop.placeholder}
          as={prop.multiline ? "textarea" : "input"}
          rows={prop.multiline ? 3 : undefined}
          helperText={prop.description}
        />
      );

    default:
      return (
        <Input 
          label={`${prop.label} ${prop.required ? '*' : ''}`}
          value={value || ''} 
          onChange={e => onChange(e.target.value)}
          placeholder={prop.placeholder}
        />
      );
  }
};
