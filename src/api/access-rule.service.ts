import { AccessRule, CreateAccessRuleInput, AccessRuleTarget } from '../types/access-rule';
import { authGuard } from './auth-guard';
import { auditService } from './audit.service';
import { v4 as uuidv4 } from 'uuid';

const LS_ACCESS_RULES = 'omnicampus_access_rules';

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

let rules: AccessRule[] = load<AccessRule>(LS_ACCESS_RULES, []);

export interface AccessEvaluationResult {
  isAccessible: boolean;
  isRoutingBlocked: boolean;
  activeRule?: AccessRule;
  reason?: string;
}

export const accessRuleService = {
  getRulesByCampus: async (campusId: string): Promise<{ success: boolean; data: AccessRule[] }> => {
    return { success: true, data: rules.filter(r => r.campusId === campusId) };
  },

  getRulesForTarget: async (targetType: AccessRuleTarget, targetId: string): Promise<{ success: boolean; data: AccessRule[] }> => {
    return {
      success: true,
      data: rules.filter(r => r.targetType === targetType && r.targetId === targetId),
    };
  },

  createRule: async (input: CreateAccessRuleInput): Promise<{ success: boolean; data?: AccessRule; message?: string }> => {
    const user = await authGuard.enforce('create', 'access_rule', { campusId: input.campusId });
    const now = new Date().toISOString();
    const newRule: AccessRule = {
      id: uuidv4(),
      campusId: input.campusId,
      targetType: input.targetType,
      targetId: input.targetId,
      ruleType: input.ruleType,
      name: input.name,
      description: input.description,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      activeDays: input.activeDays,
      openTime: input.openTime,
      closeTime: input.closeTime,
      allowedRoles: input.allowedRoles || [],
      isRoutingBlocked: input.isRoutingBlocked ?? true,
      isActive: input.isActive ?? true,
      closureReason: input.closureReason,
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    rules = [...rules, newRule];
    save(LS_ACCESS_RULES, rules);

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'ACCESS_RULE_CHANGE',
      resourceType: 'access_rule',
      resourceId: newRule.id,
      campusId: newRule.campusId,
      status: 'SUCCESS',
      details: { ruleType: newRule.ruleType, targetType: newRule.targetType, targetId: newRule.targetId },
    });

    return { success: true, data: newRule };
  },

  updateRule: async (id: string, patch: Partial<AccessRule>): Promise<{ success: boolean; data?: AccessRule; message?: string }> => {
    const existing = rules.find(r => r.id === id);
    const user = await authGuard.enforce('update', 'access_rule', { campusId: existing?.campusId });
    const idx = rules.findIndex(r => r.id === id);
    if (idx === -1) return { success: false, message: 'Access rule not found' };

    const updated: AccessRule = {
      ...rules[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    rules = rules.map(r => r.id === id ? updated : r);
    save(LS_ACCESS_RULES, rules);

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'ACCESS_RULE_CHANGE',
      resourceType: 'access_rule',
      resourceId: id,
      campusId: existing?.campusId,
      status: 'SUCCESS',
      details: { patch },
    });

    return { success: true, data: updated };
  },

  deleteRule: async (id: string): Promise<{ success: boolean; message?: string }> => {
    const existing = rules.find(r => r.id === id);
    const user = await authGuard.enforce('delete', 'access_rule', { campusId: existing?.campusId });
    rules = rules.filter(r => r.id !== id);
    save(LS_ACCESS_RULES, rules);

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'ACCESS_RULE_CHANGE',
      resourceType: 'access_rule',
      resourceId: id,
      campusId: existing?.campusId,
      status: 'SUCCESS',
    });

    return { success: true };
  },

  deleteByTarget: async (targetType: AccessRuleTarget, targetId: string): Promise<void> => {
    rules = rules.filter(r => !(r.targetType === targetType && r.targetId === targetId));
    save(LS_ACCESS_RULES, rules);
  },

  /**
   * Evaluate whether a target is currently accessible according to all active access rules.
   */
  isTargetAccessible(
    targetType: AccessRuleTarget,
    targetId: string,
    options: { time?: Date; userRoles?: string[] } = {}
  ): AccessEvaluationResult {
    const relevantRules = rules.filter(r => r.isActive && r.targetType === targetType && r.targetId === targetId);
    if (relevantRules.length === 0) {
      return { isAccessible: true, isRoutingBlocked: false };
    }

    const checkTime = options.time || new Date();
    const userRoles = options.userRoles || [];

    for (const rule of relevantRules) {
      // 1. Check validity date range
      if (rule.validFrom) {
        const fromDate = new Date(rule.validFrom);
        if (checkTime < fromDate) continue; // rule not yet active
      }
      if (rule.validUntil) {
        const untilDate = new Date(rule.validUntil);
        if (checkTime > untilDate) continue; // rule expired
      }

      // 2. Check active days of week (0 = Sunday .. 6 = Saturday)
      if (rule.activeDays && rule.activeDays.length > 0) {
        const dayOfWeek = checkTime.getDay();
        if (!rule.activeDays.includes(dayOfWeek)) continue;
      }

      // 3. Check allowed roles override (e.g. staff can enter restricted/maintenance zones)
      const hasAllowedRole = rule.allowedRoles && rule.allowedRoles.some(r => userRoles.includes(r));
      if (hasAllowedRole) {
        continue; // user is permitted by role exception
      }

      // 4. Check time of day window (openTime - closeTime)
      if (rule.openTime && rule.closeTime) {
        const currentMinutes = checkTime.getHours() * 60 + checkTime.getMinutes();
        const [openH, openM] = rule.openTime.split(':').map(Number);
        const [closeH, closeM] = rule.closeTime.split(':').map(Number);
        const openTotal = openH * 60 + openM;
        const closeTotal = closeH * 60 + closeM;

        if (openTotal <= closeTotal) {
          // Standard daytime schedule (e.g. 08:00 to 18:00)
          const isOpen = currentMinutes >= openTotal && currentMinutes <= closeTotal;
          if (isOpen) continue; // currently within open hours
        } else {
          // Overnight schedule (e.g. 20:00 to 06:00)
          const isOpen = currentMinutes >= openTotal || currentMinutes <= closeTotal;
          if (isOpen) continue;
        }

        // Outside operating hours
        const reasonText = typeof rule.closureReason === 'string'
          ? rule.closureReason
          : (rule.closureReason?.en || `Closed outside operating hours (${rule.openTime} - ${rule.closeTime})`);

        return {
          isAccessible: false,
          isRoutingBlocked: rule.isRoutingBlocked,
          activeRule: rule,
          reason: reasonText,
        };
      }

      // 5. Unconditional closure or restricted rule (e.g. temporary maintenance or restricted room)
      if (rule.ruleType === 'closure' || rule.ruleType === 'maintenance' || rule.ruleType === 'restricted') {
        const reasonText = typeof rule.closureReason === 'string'
          ? rule.closureReason
          : (rule.closureReason?.en || `${rule.name}: Access temporarily restricted (${rule.ruleType}).`);

        return {
          isAccessible: false,
          isRoutingBlocked: rule.isRoutingBlocked,
          activeRule: rule,
          reason: reasonText,
        };
      }
    }

    return { isAccessible: true, isRoutingBlocked: false };
  },

  reset(newRules?: AccessRule[]): void {
    rules = newRules ? [...newRules] : [];
    save(LS_ACCESS_RULES, rules);
  },
};

