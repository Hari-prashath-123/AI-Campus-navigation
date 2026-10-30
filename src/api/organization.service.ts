import { Organization, CreateOrganizationInput } from '../types/organization';
import { campusService } from './campus.service';
import { v4 as uuidv4 } from 'uuid';

const LS_ORGANIZATIONS = 'omnicampus_organizations';

const INITIAL_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-omnicampus',
    slug: 'omnicampus',
    name: { en: 'OmniCampus Global University' },
    description: { en: 'Primary higher education institution system.' },
    websiteUrl: 'https://omnicampus.edu',
    contactEmail: 'admin@omnicampus.edu',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

function load<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {}
  return fallback;
}

function save<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

let organizations: Organization[] = load<Organization>(LS_ORGANIZATIONS, INITIAL_ORGANIZATIONS);

export const organizationService = {
  getOrganizations: async (): Promise<{ success: boolean; data: Organization[] }> => {
    return { success: true, data: [...organizations] };
  },

  getOrganizationById: async (id: string): Promise<{ success: boolean; data?: Organization; message?: string }> => {
    const org = organizations.find(o => o.id === id);
    if (!org) return { success: false, message: 'Organization not found' };
    return { success: true, data: { ...org } };
  },

  createOrganization: async (input: CreateOrganizationInput): Promise<{ success: boolean; data?: Organization; message?: string }> => {
    const now = new Date().toISOString();
    const newOrg: Organization = {
      id: uuidv4(),
      slug: input.slug?.trim().toLowerCase() || `org-${Date.now()}`,
      name: input.name || { en: 'New Organization' },
      description: input.description,
      logoUrl: input.logoUrl,
      websiteUrl: input.websiteUrl,
      contactEmail: input.contactEmail,
      isActive: input.isActive ?? true,
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    organizations = [...organizations, newOrg];
    save(LS_ORGANIZATIONS, organizations);
    return { success: true, data: newOrg };
  },

  updateOrganization: async (id: string, patch: Partial<Organization>): Promise<{ success: boolean; data?: Organization; message?: string }> => {
    const idx = organizations.findIndex(o => o.id === id);
    if (idx === -1) return { success: false, message: 'Organization not found' };

    const updated: Organization = {
      ...organizations[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    organizations = organizations.map(o => o.id === id ? updated : o);
    save(LS_ORGANIZATIONS, organizations);
    return { success: true, data: updated };
  },

  canDeleteOrganization: async (id: string): Promise<{ canDelete: boolean; issues: string[]; campusCount: number }> => {
    const campusesRes = await campusService.getCampuses();
    const relatedCampuses = (campusesRes.data || []).filter(c => c.organizationId === id);
    const issues: string[] = [];

    if (relatedCampuses.length > 0) {
      issues.push(`Organization has ${relatedCampuses.length} active site(s)/campus(es) associated with it.`);
    }

    return {
      canDelete: issues.length === 0,
      issues,
      campusCount: relatedCampuses.length,
    };
  },

  deleteOrganization: async (id: string, force = false): Promise<{ success: boolean; message?: string }> => {
    const check = await organizationService.canDeleteOrganization(id);
    if (!check.canDelete && !force) {
      return {
        success: false,
        message: `Cannot delete organization: ${check.issues.join(' ')} Use force=true to cascade delete.`,
      };
    }

    organizations = organizations.filter(o => o.id !== id);
    save(LS_ORGANIZATIONS, organizations);
    return { success: true };
  },

  reset(): void {
    organizations = [...INITIAL_ORGANIZATIONS];
    save(LS_ORGANIZATIONS, organizations);
  },
};

