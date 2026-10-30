import { authService } from './auth.service';
import { auditService } from './audit.service';
import { UserRole, UserProfile } from '../types/auth';
import { AuthError } from '../utils/errors';

export type SecureAction = 'create' | 'read' | 'update' | 'delete' | 'import' | 'export' | 'publish';
export type SecureResource =
  | 'campus'
  | 'building'
  | 'floor'
  | 'object'
  | 'node'
  | 'connection'
  | 'access_rule'
  | 'object_type'
  | 'organization'
  | 'route'
  | 'ai_config'
  | 'system';

export interface AuthorizationScope {
  campusId?: string;
  organizationId?: string;
  resourceId?: string;
}

export interface AuthorizationResult {
  authorized: boolean;
  user: UserProfile | null;
  reason?: string;
}

/**
 * Role-Based Permission Matrix
 */
const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    allowedActions: SecureAction[];
    restrictedDeletes?: SecureResource[];
    canImportExport: boolean;
  }
> = {
  super_admin: {
    allowedActions: ['create', 'read', 'update', 'delete', 'import', 'export', 'publish'],
    canImportExport: true,
  },
  campus_admin: {
    allowedActions: ['create', 'read', 'update', 'delete', 'import', 'export', 'publish'],
    restrictedDeletes: ['campus', 'organization'], // Campus admin cannot delete the entire campus or root organization
    canImportExport: true,
  },
  editor: {
    allowedActions: ['create', 'read', 'update'],
    canImportExport: false,
  },
  viewer: {
    allowedActions: ['read'],
    canImportExport: false,
  },
};

export const authGuard = {
  /**
   * Evaluates whether the current authenticated user has permission to perform an action.
   */
  evaluate: async (
    action: SecureAction,
    resource: SecureResource,
    scope: AuthorizationScope = {}
  ): Promise<AuthorizationResult> => {
    const sessionRes = await authService.getSession();
    const session = sessionRes.data;

    // 1. Authentication check
    if (!session || !session.isAuthenticated || !session.user) {
      return {
        authorized: false,
        user: null,
        reason: 'Authentication required. No active session found.',
      };
    }

    const user = session.user;
    const permissions = ROLE_PERMISSIONS[user.role];

    // 2. Action permission check
    if (!permissions.allowedActions.includes(action)) {
      return {
        authorized: false,
        user,
        reason: `Role '${user.role}' is not authorized to perform action '${action}' on '${resource}'.`,
      };
    }

    // 3. Import / Export permission check
    if ((action === 'import' || action === 'export') && !permissions.canImportExport) {
      return {
        authorized: false,
        user,
        reason: `Role '${user.role}' does not have environment import/export permissions.`,
      };
    }

    // 4. Restricted delete check (e.g., campus_admin deleting a campus entity)
    if (action === 'delete' && permissions.restrictedDeletes?.includes(resource)) {
      return {
        authorized: false,
        user,
        reason: `Role '${user.role}' is not permitted to delete resource type '${resource}'.`,
      };
    }

    // 5. Site / Campus Data Isolation Check
    if (user.role !== 'super_admin' && scope.campusId) {
      const assigned = user.assignedCampusIds || [];
      if (!assigned.includes(scope.campusId)) {
        return {
          authorized: false,
          user,
          reason: `Data isolation: User is not authorized to access or modify campus '${scope.campusId}'.`,
        };
      }
    }

    return {
      authorized: true,
      user,
    };
  },

  /**
   * Enforces authorization and throws AuthError if denied, logging security violations to audit trail.
   */
  enforce: async (
    action: SecureAction,
    resource: SecureResource,
    scope: AuthorizationScope = {},
    details?: Record<string, any>
  ): Promise<UserProfile> => {
    const result = await authGuard.evaluate(action, resource, scope);

    if (!result.authorized) {
      // Record security violation audit log
      auditService.log({
        userId: result.user?.id || 'unauthenticated',
        userEmail: result.user?.email || 'anonymous',
        userRole: result.user?.role || 'viewer',
        action: 'SECURITY_VIOLATION',
        resourceType: resource as any,
        resourceId: scope.resourceId,
        campusId: scope.campusId,
        organizationId: scope.organizationId,
        status: 'DENIED',
        details: {
          requestedAction: action,
          denialReason: result.reason,
          ...details,
        },
      });

      throw new AuthError(result.reason || 'Unauthorized access request.');
    }

    return result.user!;
  },
};

