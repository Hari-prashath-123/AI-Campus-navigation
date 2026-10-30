import { UserRole } from './auth';

/**
 * Security, Reliability, Audit & Transaction Types
 */

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ARCHIVE'
  | 'UNARCHIVE'
  | 'IMPORT'
  | 'EXPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ACCESS_RULE_CHANGE'
  | 'BACKUP_CREATE'
  | 'BACKUP_RESTORE'
  | 'SECURITY_VIOLATION'
  | 'RATE_LIMIT_EXCEEDED';

export type AuditStatus = 'SUCCESS' | 'DENIED' | 'FAILED';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  userId: string;
  userEmail: string;
  userRole: UserRole;
  action: AuditAction;
  resourceType: 'campus' | 'building' | 'floor' | 'object' | 'node' | 'connection' | 'access_rule' | 'object_type' | 'organization' | 'system';
  resourceId?: string;
  campusId?: string;
  organizationId?: string;
  status: AuditStatus;
  details?: Record<string, any>;
  ipAddress?: string;
}

export interface RateLimitStatus {
  isAllowed: boolean;
  remaining: number;
  resetTimeMs: number;
  totalLimit: number;
}

export interface BackupMetadata {
  version: string;
  timestamp: string;
  checksum: string; // SHA-256 or secure hash
  environment: string;
  stats: {
    campusesCount: number;
    buildingsCount: number;
    floorsCount: number;
    objectsCount: number;
    nodesCount: number;
    connectionsCount: number;
    accessRulesCount: number;
  };
}

export interface DatabaseBackupPayload {
  metadata: BackupMetadata;
  data: {
    organizations: any[];
    campuses: any[];
    buildings: any[];
    floors: any[];
    objects: any[];
    nodes: any[];
    connections: any[];
    accessRules: any[];
    objectTypes: any[];
  };
}

export interface TransactionStepResult<T = any> {
  stepName: string;
  data?: T;
}

