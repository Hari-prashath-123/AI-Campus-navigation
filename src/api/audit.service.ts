import { AuditLogEntry, AuditAction, AuditStatus } from '../types/security';
import { v4 as uuidv4 } from 'uuid';

const LS_AUDIT_LOGS = 'omnicampus_audit_logs';

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

let auditLogs: AuditLogEntry[] = load<AuditLogEntry>(LS_AUDIT_LOGS, []);

export interface AuditLogFilter {
  campusId?: string;
  organizationId?: string;
  userId?: string;
  action?: AuditAction;
  status?: AuditStatus;
  resourceType?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export const auditService = {
  /**
   * Record a new audit log entry.
   */
  log: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry => {
    const fullEntry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...entry,
    };

    // Keep most recent 1000 logs in storage
    auditLogs = [fullEntry, ...auditLogs].slice(0, 1000);
    save(LS_AUDIT_LOGS, auditLogs);
    return fullEntry;
  },

  /**
   * Retrieve audit logs matching filter criteria.
   */
  getLogs: (filter: AuditLogFilter = {}): AuditLogEntry[] => {
    let results = [...auditLogs];

    if (filter.campusId) {
      results = results.filter(l => l.campusId === filter.campusId);
    }
    if (filter.organizationId) {
      results = results.filter(l => l.organizationId === filter.organizationId);
    }
    if (filter.userId) {
      results = results.filter(l => l.userId === filter.userId);
    }
    if (filter.action) {
      results = results.filter(l => l.action === filter.action);
    }
    if (filter.status) {
      results = results.filter(l => l.status === filter.status);
    }
    if (filter.resourceType) {
      results = results.filter(l => l.resourceType === filter.resourceType);
    }
    if (filter.fromDate) {
      const from = new Date(filter.fromDate);
      results = results.filter(l => new Date(l.timestamp) >= from);
    }
    if (filter.toDate) {
      const to = new Date(filter.toDate);
      results = results.filter(l => new Date(l.timestamp) <= to);
    }

    if (filter.limit && filter.limit > 0) {
      results = results.slice(0, filter.limit);
    }

    return results;
  },

  /**
   * Helper to query security violations and unauthorized attempts.
   */
  getSecurityViolations: (): AuditLogEntry[] => {
    return auditLogs.filter(l => l.status === 'DENIED' || l.action === 'SECURITY_VIOLATION');
  },

  /**
   * Reset logs for testing or initialization.
   */
  reset: (newLogs?: AuditLogEntry[]): void => {
    auditLogs = newLogs ? [...newLogs] : [];
    save(LS_AUDIT_LOGS, auditLogs);
  },
};

