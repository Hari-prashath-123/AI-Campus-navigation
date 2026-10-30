import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Building2, Globe, Mail, Edit2, Trash2,
  XCircle, ChevronRight,
} from 'lucide-react';
import { organizationService } from '../api/organization.service';
import { Organization, CreateOrganizationInput } from '../types/organization';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

// ─── Create / Edit Form ───────────────────────────────────────────────────────

interface OrgFormData {
  name: string;
  slug: string;
  contactEmail: string;
  websiteUrl: string;
  description: string;
  isActive: boolean;
}

const emptyForm = (): OrgFormData => ({
  name: '', slug: '', contactEmail: '', websiteUrl: '', description: '', isActive: true,
});

function toSlug(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const OrganizationList: React.FC = () => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Organization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [form, setForm] = useState<OrgFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState('');

  useEffect(() => { loadOrgs(); }, []);

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const res = await organizationService.getOrganizations();
      if (res.success) setOrgs(res.data);
      else setError('Failed to load organizations.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(emptyForm());
    setShowCreate(true);
  };

  const openEdit = (org: Organization) => {
    setForm({
      name: org.name.en || '',
      slug: org.slug,
      contactEmail: org.contactEmail || '',
      websiteUrl: org.websiteUrl || '',
      description: org.description?.en || '',
      isActive: org.isActive,
    });
    setEditTarget(org);
  };

  const openDelete = async (org: Organization) => {
    const check = await organizationService.canDeleteOrganization(org.id);
    setDeleteWarning(check.issues.join(' '));
    setDeleteTarget(org);
  };

  const handleNameChange = (val: string) => {
    setForm(f => ({ ...f, name: val, slug: f.slug || toSlug(val) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTarget) {
        await organizationService.updateOrganization(editTarget.id, {
          name: { en: form.name },
          slug: form.slug,
          contactEmail: form.contactEmail,
          websiteUrl: form.websiteUrl,
          description: { en: form.description },
          isActive: form.isActive,
        });
        setEditTarget(null);
      } else {
        const input: CreateOrganizationInput = {
          name: { en: form.name },
          slug: form.slug,
          contactEmail: form.contactEmail,
          websiteUrl: form.websiteUrl || undefined,
          description: form.description ? { en: form.description } : undefined,
          isActive: form.isActive,
        };
        await organizationService.createOrganization(input);
        setShowCreate(false);
      }
      loadOrgs();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await organizationService.deleteOrganization(deleteTarget.id, false);
      setDeleteTarget(null);
      loadOrgs();
    } catch (e: any) {
      setDeleteWarning(e.message || 'Delete failed.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = orgs.filter(o =>
    o.name.en?.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && orgs.length === 0) return <LoadingState text="Loading organizations..." />;
  if (error) return <ErrorState title="Error" message={error} onRetry={loadOrgs} />;

  const isFormValid = form.name.trim() && form.slug.trim();

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-outfit font-bold text-slate-900 tracking-tight">Organizations</h1>
            <p className="text-slate-500 mt-1">Manage tenants — each organization owns its own sites, buildings, and data.</p>
          </div>
          <Button variant="primary" icon={<Plus size={18} />} onClick={openCreate}>
            New Organization
          </Button>
        </div>
        <div className="mt-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search organizations..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-8">
        {filtered.length === 0 ? (
          <EmptyState
            title="No Organizations"
            message="Create your first organization to isolate sites and data."
            icon={<Building2 size={48} />}
            action={{ label: 'New Organization', onClick: openCreate }}
          />
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto">
            {filtered.map(org => (
              <div
                key={org.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all p-5 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {(org.name.en || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-outfit font-bold text-slate-900 text-base truncate">{org.name.en}</h3>
                      {org.isActive
                        ? <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Active</span>
                        : <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">Inactive</span>
                      }
                    </div>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">/{org.slug}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
                      {org.contactEmail && (
                        <span className="flex items-center gap-1"><Mail size={11} />{org.contactEmail}</span>
                      )}
                      {org.websiteUrl && (
                        <span className="flex items-center gap-1"><Globe size={11} />{org.websiteUrl}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/admin/campuses?org=${org.id}`}>
                    <Button variant="outline" size="sm" icon={<ChevronRight size={14} />}>
                      Sites
                    </Button>
                  </Link>
                  <Button
                    variant="ghost" size="sm"
                    className="text-slate-500 hover:text-blue-600"
                    onClick={() => openEdit(org)}
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => openDelete(org)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showCreate || !!editTarget}
        onClose={() => { setShowCreate(false); setEditTarget(null); }}
        title={editTarget ? 'Edit Organization' : 'Create Organization'}
      >
        <div className="space-y-4">
          <Input
            label="Organization Name"
            placeholder="e.g. Metro Health Network"
            value={form.name}
            onChange={e => handleNameChange(e.target.value)}
            autoFocus
          />
          <Input
            label="Slug (URL identifier)"
            placeholder="e.g. metro-health"
            value={form.slug}
            onChange={e => setForm(f => ({ ...f, slug: toSlug(e.target.value) }))}
            helperText="Lowercase letters, numbers, and hyphens only."
          />
          <Input
            label="Contact Email"
            type="email"
            placeholder="admin@example.org"
            value={form.contactEmail}
            onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
          />
          <Input
            label="Website URL (optional)"
            type="url"
            placeholder="https://example.org"
            value={form.websiteUrl}
            onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              placeholder="Brief description of this organization"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-blue-600"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
            />
            <span className="text-sm text-slate-700">Organization is active</span>
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditTarget(null); }}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} isLoading={saving} disabled={!isFormValid}>
              {editTarget ? 'Save Changes' : 'Create Organization'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Organization">
        <div className="space-y-4">
          {deleteWarning ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <XCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Cannot delete safely</p>
                <p className="mt-1">{deleteWarning}</p>
                <p className="mt-2 text-xs">Delete or reassign the organization's sites first, then try again.</p>
              </div>
            </div>
          ) : (
            <p className="text-slate-600">
              Are you sure you want to permanently delete <strong>{deleteTarget?.name.en}</strong>? This cannot be undone.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            {!deleteWarning && (
              <Button variant="danger" onClick={handleDelete} isLoading={saving}>Delete</Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

