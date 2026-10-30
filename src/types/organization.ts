import { LocalizedString } from './multilingual';

export interface Organization {
  id: string;
  slug: string;
  name: LocalizedString;
  description?: LocalizedString;
  logoUrl?: string;
  websiteUrl?: string;
  contactEmail?: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationInput {
  slug?: string;
  name: LocalizedString;
  description?: LocalizedString;
  logoUrl?: string;
  websiteUrl?: string;
  contactEmail?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

