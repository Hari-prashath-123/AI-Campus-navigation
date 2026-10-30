import { LocalizedString } from './multilingual';
import { AccessRuleTarget, AccessRuleType } from './db-schema';

export { type AccessRuleTarget, type AccessRuleType };

export interface AccessRule {
  id: string;
  campusId: string;
  targetType: AccessRuleTarget;
  targetId: string; // The ID of the object, edge, floor, or building
  ruleType: AccessRuleType;
  name: string;
  description?: string;
  validFrom?: string; // ISO date-time string
  validUntil?: string; // ISO date-time string
  activeDays?: number[]; // [0..6] (0 = Sunday, 6 = Saturday)
  openTime?: string; // "HH:MM" e.g. "08:00"
  closeTime?: string; // "HH:MM" e.g. "18:00"
  allowedRoles?: string[]; // e.g. ['staff', 'admin', 'security']
  isRoutingBlocked: boolean; // whether pathfinding must treat this as blocked
  isActive: boolean;
  closureReason?: LocalizedString | string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccessRuleInput {
  campusId: string;
  targetType: AccessRuleTarget;
  targetId: string;
  ruleType: AccessRuleType;
  name: string;
  description?: string;
  validFrom?: string;
  validUntil?: string;
  activeDays?: number[];
  openTime?: string;
  closeTime?: string;
  allowedRoles?: string[];
  isRoutingBlocked?: boolean;
  isActive?: boolean;
  closureReason?: LocalizedString | string;
  metadata?: Record<string, unknown>;
}

