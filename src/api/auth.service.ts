import { apiClient } from './client';
import { AuthSession, UserProfile, ApiResponse } from '../types';

/**
 * Authentication Service Abstraction
 */
export class AuthService {
  private static instance: AuthService;
  private currentSession: AuthSession = {
    user: {
      id: 'usr-admin-1',
      email: 'admin@omnicampus.internal',
      fullName: 'Campus Administrator',
      role: 'super_admin',
      assignedCampusIds: ['campus-tech-inst', 'campus-metro-health'],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    token: 'mock-jwt-token-xyz-123',
    isAuthenticated: true,
  };

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async getSession(): Promise<ApiResponse<AuthSession>> {
    return apiClient.simulateNetwork(this.currentSession);
  }

  public async logout(): Promise<ApiResponse<void>> {
    this.currentSession = { user: null, token: null, isAuthenticated: false };
    return apiClient.simulateNetwork(undefined);
  }

  public async loginAsDemoAdmin(role: UserProfile['role'] = 'super_admin'): Promise<ApiResponse<AuthSession>> {
    this.currentSession = {
      user: {
        id: 'usr-admin-1',
        email: 'admin@omnicampus.internal',
        fullName: role === 'super_admin' ? 'Super Administrator' : 'Campus Operator',
        role,
        assignedCampusIds: ['campus-tech-inst', 'campus-metro-health'],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      token: 'mock-jwt-token-xyz-123',
      isAuthenticated: true,
    };
    return apiClient.simulateNetwork(this.currentSession);
  }
}

export const authService = AuthService.getInstance();
