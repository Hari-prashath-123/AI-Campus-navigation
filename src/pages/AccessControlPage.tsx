import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShieldAlert, ShieldCheck, Plus, Trash2, Edit2, Clock,
  Calendar, Users, AlertTriangle, Lock, Wrench,
} from 'lucide-react';
import { accessRuleService } from '../api/access-rule.service';
import { AccessRule, CreateAccessRuleInput } from '../types/access-rule';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { campusService } from '../api/campus.service';
import { Campus } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const RULE_TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  schedule: { label: 'Schedule', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: <Clock size={13} /> },
  closure:  { label: 'Closure',  color: 'text-red-700 bg-red-50 border-red-200',    icon: <AlertTriangle size={13} /> },
  maintenance: { label: 'Maintenance', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: <Wrench size={13} /> },
  restricted: { label: 'Restricted', color: 'text-purple-700 bg-purple-50 border-purple-200', icon: <Lock size={13} /> },
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  object: 'Object/Room',
  floor: 'Floor',
  building: 'Building',
  campus: 'Campus',
  connection: 'Connection',
};

interface RuleFormData {
  targetType: string;
  targetId: string;
  ruleType: string;
  name: string;
  closureReason: string;
  openTime: string;
  closeTime: string;
  activeDays: number[];
  allowedRoles: string;
  isRoutingBlocked: boolean;
  validFrom: string;
  validUntil: string;
}

const emptyForm = (): RuleFormData => ({
  targetType: 'object',
  targetId: '',
  ruleType: 'closure',
  name: '',
  closureReason: '',
  openTime: '',
  closeTime: '',
  activeDays: [1, 2, 3, 4, 5],
  allowedRoles: '',
  isRoutingBlocked: true,
  validFrom: '',
  validUntil: '',
});

// ─── Rule Card ────────────────────────────────────────────────────────────────

const RuleCard: React.FC<{ rule: AccessRule; onEdit: () => void; onDelete: () => void }> = ({ rule, onEdit, onDelete }) => {
  const meta = RULE_TYPE_META[rule.ruleType] || RULE_TYPE_META.closure;
  const reason = typeof rule.closureReason === 'string'
    ? rule.closureReason
    : (rule.closureReason as any)?.en;

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-3 ${rule.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.color}`}>
            {meta.icon} {meta.label}
          </span>
          <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
            {TARGET_TYPE_LABELS[rule.targetType] || rule.targetType}
          </span>
          {rule.isRoutingBlocked && (
            <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldAlert size={11} /> Routing blocked
            </span>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-blue-600" onClick={onEdit}><Edit2 size={14} /></Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={onDelete}><Trash2 size={14} /></Button>
        </div>
      </div>

      <div>
        <p className="font-semibold text-slate-900 text-sm">{rule.name}</p>
        {reason && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{reason}</p>}
        <p className="text-xs font-mono text-slate-400 mt-1">Target ID: {rule.targetId}</p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {(rule.openTime && rule.closeTime) && (
          <span className="flex items-center gap-1"><Clock size={11} />{rule.openTime} – {rule.closeTime}</span>
        )}
        {rule.activeDays && rule.activeDays.length > 0 && (
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {rule.activeDays.map(d => DAY_LABELS[d]).join(', ')}
          </span>
        )}
        {rule.allowedRoles && rule.allowedRoles.length > 0 && (
          <span className="flex items-center gap-1"><Users size={11} />{rule.allowedRoles.join(', ')} may override</span>
        )}
        {(rule.validFrom || rule.validUntil) && (
          <span>Valid: {rule.validFrom || '∞'} → {rule.validUntil || '∞'}</span>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const AccessControlPage: React.FC = () => {
  const { campusId } = useParams<{ campusId: string }>();
  const [campus, setCampus] = useState<Campus | null>(null);
  const [rules, setRules] = useState<AccessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<AccessRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccessRule | null>(null);
  const [form, setForm] = useState<RuleFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>('');

  useEffect(() => {
    if (campusId) {
      loadAll(campusId);
    } else {
      loadAll(undefined);
    }
  }, [campusId]);

  const loadAll = async (cId?: string) => {
    setLoading(true);
    try {
      if (cId) {
        const [campusRes, rulesRes] = await Promise.all([
          campusService.getCampusById(cId),
          accessRuleService.getRulesByCampus(cId),
        ]);
        if (campusRes.success) setCampus(campusRes.data!);
        if (rulesRes.success) setRules(rulesRes.data);
      } else {
        // Load all rules across all campuses
        const campusesRes = await campusService.getCampuses();
        const allRules: AccessRule[] = [];
        for (const c of campusesRes.data) {
          const r = await accessRuleService.getRulesByCampus(c.id);
          if (r.success) allRules.push(...r.data);
        }
        setRules(allRules);
      }
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ ...emptyForm(), targetType: 'object' });
    setEditTarget(null);
    setShowForm(true);
  };

  const openEdit = (rule: AccessRule) => {
    setForm({
      targetType: rule.targetType,
      targetId: rule.targetId,
      ruleType: rule.ruleType,
      name: rule.name,
      closureReason: typeof rule.closureReason === 'string'
        ? rule.closureReason
        : (rule.closureReason as any)?.en || '',
      openTime: rule.openTime || '',
      closeTime: rule.closeTime || '',
      activeDays: rule.activeDays || [],
      allowedRoles: (rule.allowedRoles || []).join(', '),
      isRoutingBlocked: rule.isRoutingBlocked,
      validFrom: rule.validFrom || '',
      validUntil: rule.validUntil || '',
    });
    setEditTarget(rule);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!campusId && !editTarget) return;
    setSaving(true);
    try {
      const rolesArr = form.allowedRoles
        ? form.allowedRoles.split(',').map(r => r.trim()).filter(Boolean)
        : [];

      if (editTarget) {
        await accessRuleService.updateRule(editTarget.id, {
          name: form.name,
          ruleType: form.ruleType as any,
          closureReason: form.closureReason || undefined,
          openTime: form.openTime || undefined,
          closeTime: form.closeTime || undefined,
          activeDays: form.activeDays,
          allowedRoles: rolesArr,
          isRoutingBlocked: form.isRoutingBlocked,
          validFrom: form.validFrom || undefined,
          validUntil: form.validUntil || undefined,
        });
      } else {
        const input: CreateAccessRuleInput = {
          campusId: campusId!,
          targetType: form.targetType as any,
          targetId: form.targetId,
          ruleType: form.ruleType as any,
          name: form.name,
          closureReason: form.closureReason || undefined,
          openTime: form.openTime || undefined,
          closeTime: form.closeTime || undefined,
          activeDays: form.activeDays,
          allowedRoles: rolesArr,
          isRoutingBlocked: form.isRoutingBlocked,
          validFrom: form.validFrom || undefined,
          validUntil: form.validUntil || undefined,
          isActive: true,
        };
        await accessRuleService.createRule(input);
      }
      setShowForm(false);
      setEditTarget(null);
      if (campusId) loadAll(campusId);
      else loadAll(undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await accessRuleService.deleteRule(deleteTarget.id);
      setDeleteTarget(null);
      if (campusId) loadAll(campusId);
      else loadAll(undefined);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (d: number) => {
    setForm(f => ({
      ...f,
      activeDays: f.activeDays.includes(d)
        ? f.activeDays.filter(x => x !== d)
        : [...f.activeDays, d].sort(),
    }));
  };

  const visibleRules = filterType
    ? rules.filter(r => r.ruleType === filterType)
    : rules;

  const breadcrumbItems = campusId && campus
    ? [
        { label: 'Campuses', path: '/admin/campuses' },
        { label: campus.name.en || campus.code, path: `/admin/campuses/${campus.id}` },
        { label: 'Access Control' },
      ]
    : [{ label: 'Access Control' }];

  if (loading) return <LoadingState text="Loading access rules..." />;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-outfit font-bold text-slate-900">
            Access Control {campus && <span className="text-slate-400 font-normal">— {campus.name.en}</span>}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage schedules, temporary closures, restricted areas, and routing blocks.
          </p>
        </div>
        {campusId && (
          <Button variant="primary" icon={<Plus size={18} />} onClick={openCreate}>
            Add Rule
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-100 px-8 py-2 flex gap-2">
        {[{ v: '', l: 'All' }, { v: 'schedule', l: 'Schedule' }, { v: 'closure', l: 'Closure' }, { v: 'maintenance', l: 'Maintenance' }, { v: 'restricted', l: 'Restricted' }].map(({ v, l }) => (
          <button
            key={v}
            onClick={() => setFilterType(v)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              filterType === v
                ? 'bg-blue-600 text-white border-blue-600'
                : 'text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 bg-white'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Rules Grid */}
      <div className="flex-1 overflow-y-auto p-8">
        {visibleRules.length === 0 ? (
          <EmptyState
            title="No Access Rules"
            message={campusId ? "Add rules to schedule openings, closures, restricted areas, or maintenance windows." : "Select a campus to manage its access rules."}
            icon={<ShieldCheck size={48} />}
            action={campusId ? { label: 'Add Rule', onClick: openCreate } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 max-w-7xl mx-auto">
            {visibleRules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onEdit={() => openEdit(rule)}
                onDelete={() => setDeleteTarget(rule)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        title={editTarget ? 'Edit Access Rule' : 'New Access Rule'}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Rule type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Rule Type</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(RULE_TYPE_META).map(([v, m]) => (
                <button
                  key={v}
                  onClick={() => setForm(f => ({ ...f, ruleType: v }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.ruleType === v
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Rule Name"
            placeholder="e.g. Lab Closed for Bio-safety Sterilization"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />

          {!editTarget && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Type</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.targetType}
                  onChange={e => setForm(f => ({ ...f, targetType: e.target.value }))}
                >
                  {Object.entries(TARGET_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Target ID"
                placeholder="Paste the object/floor/building ID"
                value={form.targetId}
                onChange={e => setForm(f => ({ ...f, targetId: e.target.value }))}
                helperText="Copy the ID from the object/floor/building detail page."
              />
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Closure / Restriction Reason</label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              placeholder="Explain why this area is restricted or closed"
              value={form.closureReason}
              onChange={e => setForm(f => ({ ...f, closureReason: e.target.value }))}
            />
          </div>

          {/* Time window */}
          {form.ruleType === 'schedule' && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Opens at"
                type="time"
                value={form.openTime}
                onChange={e => setForm(f => ({ ...f, openTime: e.target.value }))}
              />
              <Input
                label="Closes at"
                type="time"
                value={form.closeTime}
                onChange={e => setForm(f => ({ ...f, closeTime: e.target.value }))}
              />
            </div>
          )}

          {/* Active days */}
          {form.ruleType === 'schedule' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Active Days</label>
              <div className="flex gap-1.5 flex-wrap">
                {DAY_LABELS.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={`w-9 h-9 rounded-full text-xs font-semibold border transition-colors ${
                      form.activeDays.includes(i)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Validity window */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valid From (optional)"
              type="date"
              value={form.validFrom}
              onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
            />
            <Input
              label="Valid Until (optional)"
              type="date"
              value={form.validUntil}
              onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
            />
          </div>

          {/* Allowed Roles Override */}
          <Input
            label="Allowed Roles Override (optional)"
            placeholder="staff, security, admin (comma-separated)"
            value={form.allowedRoles}
            onChange={e => setForm(f => ({ ...f, allowedRoles: e.target.value }))}
            helperText="Users with these roles can still access this area despite the rule."
          />

          {/* Routing blocked toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:border-red-200 bg-slate-50 hover:bg-red-50/30 transition-colors">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-red-600"
              checked={form.isRoutingBlocked}
              onChange={e => setForm(f => ({ ...f, isRoutingBlocked: e.target.checked }))}
            />
            <div>
              <p className="text-sm font-medium text-slate-800">Block routing to this target</p>
              <p className="text-xs text-slate-500">Navigation will not route through or to this area while the rule is active.</p>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
          <Button variant="outline" onClick={() => { setShowForm(false); setEditTarget(null); }}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={saving}
            disabled={!form.name.trim() || (!editTarget && !form.targetId.trim())}
          >
            {editTarget ? 'Save Changes' : 'Create Rule'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Access Rule">
        <div className="space-y-4">
          <p className="text-slate-600">
            Delete rule <strong>{deleteTarget?.name}</strong>? Routing will no longer be blocked and any scheduled closures will be lifted immediately.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={saving}>Delete Rule</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

