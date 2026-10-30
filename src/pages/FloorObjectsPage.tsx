import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box, Archive, Copy, Trash2, Plus, Search,
  ArchiveRestore, ShieldAlert, Tag, Map,
} from 'lucide-react';
import * as icons from 'lucide-react';
import { objectStore } from '../api/object.store';
import { objectTypeService } from '../api/object-type.service';
import { accessRuleService } from '../api/access-rule.service';
import { campusService } from '../api/campus.service';
import { MapObject } from '../types/object';
import { ObjectType } from '../types';
import { AccessEvaluationResult } from '../api/access-rule.service';
import { Campus, Building, Floor } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

// ─── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  draft: 'text-slate-600 bg-slate-50 border-slate-200',
  inactive: 'text-slate-500 bg-slate-50 border-slate-200',
  archived: 'text-slate-400 bg-slate-50 border-slate-100',
  under_maintenance: 'text-amber-700 bg-amber-50 border-amber-200',
  demolished: 'text-red-500 bg-red-50 border-red-200',
};

// ─── Add / Edit Object Form ───────────────────────────────────────────────────

interface ObjFormData {
  code: string;
  nameEn: string;
  category: string;
  objectTypeId: string;
  status: string;
  isAccessible: boolean;
  subZoneType: string;
}

const emptyObjForm = (): ObjFormData => ({
  code: '', nameEn: '', category: 'room', objectTypeId: '', status: 'active',
  isAccessible: true, subZoneType: '',
});

// ─── Object Card ──────────────────────────────────────────────────────────────

const ObjectCard: React.FC<{
  obj: MapObject;
  type?: ObjectType;
  accessResult?: AccessEvaluationResult;
  onArchive: () => void;
  onUnarchive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  campusId: string; buildingId: string; floorId: string;
}> = ({ obj, type, accessResult, onArchive, onUnarchive, onDuplicate, onDelete, campusId, buildingId, floorId }) => {
  const IconComponent = type?.iconName ? (icons as any)[type.iconName] || icons.Box : icons.Box;
  const iconColor = type?.color || '#64748b';
  const status = obj.status || (obj.isArchived ? 'archived' : 'active');
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.active;

  return (
    <div className={`bg-white rounded-xl border shadow-sm flex flex-col group transition-all hover:shadow-md ${obj.isArchived ? 'opacity-60 border-slate-100' : 'border-slate-200 hover:border-blue-300'}`}>
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${iconColor}15`, color: iconColor }}>
          <IconComponent size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate">{obj.name?.en || obj.code}</p>
              <p className="text-xs font-mono text-slate-400 mt-0.5">{obj.code}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${statusStyle}`}>
              {status}
            </span>
          </div>
          {type && <p className="text-xs text-slate-500 mt-1">{type.name}</p>}
          {obj.subZoneType && (
            <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5 mt-1">
              <Tag size={9} /> {obj.subZoneType}
            </span>
          )}
          {accessResult && !accessResult.isAccessible && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-red-600">
              <ShieldAlert size={11} /> {accessResult.reason?.slice(0, 60)}
            </div>
          )}
        </div>
      </div>

      {/* Children zones indicator */}
      {obj.parentObjectId == null && (() => {
        const children = objectStore.getChildZones(obj.id);
        return children.length > 0 ? (
          <div className="px-4 pb-2">
            <p className="text-xs text-slate-400">{children.length} sub-zone{children.length !== 1 && 's'}</p>
          </div>
        ) : null;
      })()}

      {/* Actions */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1">
          {obj.isArchived ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-500 hover:text-emerald-600" onClick={onUnarchive}>
              <ArchiveRestore size={14} />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-500 hover:text-amber-600" onClick={onArchive}>
              <Archive size={14} />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-500 hover:text-blue-600" onClick={onDuplicate}>
            <Copy size={14} />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
        <Link
          to={`/admin/campuses/${campusId}/buildings/${buildingId}/floors/${floorId}/map`}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Map size={12} /> Edit on map
        </Link>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const FloorObjectsPage: React.FC = () => {
  const { campusId, buildingId, floorId } = useParams<{
    campusId: string; buildingId: string; floorId: string;
  }>();

  const [campus, setCampus] = useState<Campus | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [floor, setFloor] = useState<Floor | null>(null);
  const [objects, setObjects] = useState<MapObject[]>([]);
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [accessMap, setAccessMap] = useState<Record<string, AccessEvaluationResult>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<ObjFormData>(emptyObjForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MapObject | null>(null);
  const [deleteForce, setDeleteForce] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState('');

  useEffect(() => {
    if (campusId && buildingId && floorId) loadAll();
  }, [campusId, buildingId, floorId, showArchived]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [campusRes, buildingRes, floorRes, typesRes] = await Promise.all([
        campusService.getCampusById(campusId!),
        campusService.getBuildingById(buildingId!),
        campusService.getFloorById(floorId!),
        objectTypeService.getAll(),
      ]);
      if (campusRes.success) setCampus(campusRes.data!);
      if (buildingRes.success) setBuilding(buildingRes.data!);
      if (floorRes.success) setFloor(floorRes.data!);
      if (typesRes.success) setObjectTypes(typesRes.data);

      const objs = objectStore.getByFloor(floorId!, showArchived);
      setObjects(objs);

      // Evaluate access for each object
      const am: Record<string, AccessEvaluationResult> = {};
      for (const o of objs) {
        am[o.id] = accessRuleService.isTargetAccessible('object', o.id);
      }
      setAccessMap(am);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateObject = async () => {
    if (!form.code.trim() || !form.nameEn.trim() || !campusId || !buildingId || !floorId) return;
    setSaving(true);
    try {
      objectStore.create({
        campusId,
        buildingId,
        floorId,
        code: form.code,
        name: { en: form.nameEn },
        category: form.category,
        objectTypeId: form.objectTypeId || undefined,
        status: form.status as any,
        isAccessible: form.isAccessible,
        subZoneType: form.subZoneType || undefined,
        associatedNodeId: '',
        coordinates: { x: 0, y: 0 },
        isArchived: false,
      } as any);
      setShowCreate(false);
      setForm(emptyObjForm());
      loadAll();
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = (obj: MapObject) => {
    objectStore.archive(obj.id);
    loadAll();
  };
  const handleUnarchive = (obj: MapObject) => {
    objectStore.unarchive(obj.id);
    loadAll();
  };
  const handleDuplicate = (obj: MapObject) => {
    objectStore.duplicate(obj.id, { code: `${obj.code}-COPY` });
    loadAll();
  };

  const openDelete = (obj: MapObject) => {
    const report = objectStore.canDelete(obj.id);
    if (!report.canDelete) {
      setDeleteWarning(report.issues.join(' '));
    } else {
      setDeleteWarning('');
    }
    setDeleteForce(false);
    setDeleteTarget(obj);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const ok = objectStore.delete(deleteTarget.id, deleteForce);
    if (ok) { setDeleteTarget(null); loadAll(); }
    else setDeleteWarning('Delete failed. Enable force mode to cascade-delete sub-zones.');
  };

  const typeById = (id?: string) => objectTypes.find(t => t.id === id);

  const filtered = objects.filter(o => {
    const matchSearch = !search ||
      o.code.toLowerCase().includes(search.toLowerCase()) ||
      (o.name?.en || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || (o.status || (o.isArchived ? 'archived' : 'active')) === filterStatus;
    return matchSearch && matchStatus;
  });

  // Group: top-level first, then children
  const topLevel = filtered.filter(o => !o.parentObjectId);
  const children = filtered.filter(o => !!o.parentObjectId);

  if (loading) return <LoadingState text="Loading objects..." />;

  const breadcrumbs = [
    { label: 'Campuses', path: '/admin/campuses' },
    { label: campus?.name.en || campusId!, path: `/admin/campuses/${campusId}` },
    { label: building?.name.en || buildingId!, path: `/admin/campuses/${campusId}/buildings/${buildingId}` },
    { label: `L${floor?.level ?? '?'} – ${floor?.name.en || 'Floor'}` },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <Breadcrumbs items={breadcrumbs} />

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-outfit font-bold text-slate-900">
              {floor?.name.en} — Objects
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Rooms, amenities, zones, and sub-areas on this floor.
              <Link
                to={`/admin/campuses/${campusId}/buildings/${buildingId}/floors/${floorId}`}
                className="ml-3 text-blue-600 hover:underline text-xs font-medium"
              >
                Open Map Editor →
              </Link>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={showArchived ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowArchived(v => !v)}
            >
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </Button>
            <Button variant="primary" icon={<Plus size={18} />} onClick={() => { setForm(emptyObjForm()); setShowCreate(true); }}>
              Add Object
            </Button>
          </div>
        </div>

        {/* Search + filter */}
        <div className="mt-4 flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by name or code..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="inactive">Inactive</option>
            <option value="under_maintenance">Under Maintenance</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">

        {/* Top-level objects */}
        {topLevel.length === 0 && children.length === 0 ? (
          <EmptyState
            title="No Objects"
            message="Draw rooms and amenities in the map editor, or add them manually here."
            icon={<Box size={48} />}
            action={{ label: 'Add Object', onClick: () => { setForm(emptyObjForm()); setShowCreate(true); } }}
          />
        ) : (
          <>
            {topLevel.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Rooms & Spaces ({topLevel.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {topLevel.map(obj => (
                    <ObjectCard
                      key={obj.id}
                      obj={obj}
                      type={typeById(obj.objectTypeId)}
                      accessResult={accessMap[obj.id]}
                      onArchive={() => handleArchive(obj)}
                      onUnarchive={() => handleUnarchive(obj)}
                      onDuplicate={() => handleDuplicate(obj)}
                      onDelete={() => openDelete(obj)}
                      campusId={campusId!}
                      buildingId={buildingId!}
                      floorId={floorId!}
                    />
                  ))}
                </div>
              </div>
            )}

            {children.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Sub-Zones & Internal Areas ({children.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {children.map(obj => (
                    <ObjectCard
                      key={obj.id}
                      obj={obj}
                      type={typeById(obj.objectTypeId)}
                      accessResult={accessMap[obj.id]}
                      onArchive={() => handleArchive(obj)}
                      onUnarchive={() => handleUnarchive(obj)}
                      onDuplicate={() => handleDuplicate(obj)}
                      onDelete={() => openDelete(obj)}
                      campusId={campusId!}
                      buildingId={buildingId!}
                      floorId={floorId!}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Object Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Object">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Code"
              placeholder="e.g. ROOM-101"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              autoFocus
            />
            <Input
              label="Name (English)"
              placeholder="e.g. Computer Lab"
              value={form.nameEn}
              onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {['room', 'amenity', 'entrance', 'service', 'emergency', 'outdoor'].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Object Type (optional)</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.objectTypeId}
                onChange={e => setForm(f => ({ ...f, objectTypeId: e.target.value }))}
              >
                <option value="">— None —</option>
                {objectTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                {['draft', 'active', 'inactive', 'under_maintenance'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sub-Zone Type (optional)</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.subZoneType}
                onChange={e => setForm(f => ({ ...f, subZoneType: e.target.value }))}
              >
                <option value="">— Not a sub-zone —</option>
                {['workstation', 'staff_area', 'cabin', 'equipment_zone', 'storage_bay', 'restricted_zone'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-blue-600"
              checked={form.isAccessible}
              onChange={e => setForm(f => ({ ...f, isAccessible: e.target.checked }))}
            />
            <span className="text-sm text-slate-700">Wheelchair accessible</span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreateObject}
              isLoading={saving}
              disabled={!form.code.trim() || !form.nameEn.trim()}
            >
              Add Object
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Object">
        <div className="space-y-4">
          {deleteWarning && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Cannot delete safely</p>
                <p className="mt-1 text-xs">{deleteWarning}</p>
              </div>
            </div>
          )}
          <p className="text-slate-600">
            Delete <strong>{deleteTarget?.name?.en || deleteTarget?.code}</strong>?
            {deleteWarning && ' Enable force mode below to also delete all sub-zones.'}
          </p>
          {deleteWarning && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-red-600"
                checked={deleteForce}
                onChange={e => setDeleteForce(e.target.checked)}
              />
              <span className="text-sm text-red-700 font-medium">Force delete (cascade all sub-zones)</span>
            </label>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

