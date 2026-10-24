/**
 * Authentication & Authorization Types
 */

export type UserRole = 'super_admin' | 'campus_admin' | 'editor' | 'viewer';

export interface UserPermission {
  action: 'create' | 'read' | 'update' | 'delete' | 'publish';
  resource: 'campus' | 'building' | 'floor' | 'object' | 'connection' | 'route' | 'ai_config';
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  assignedCampusIds: string[]; // Access control scope
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthSession {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
}
