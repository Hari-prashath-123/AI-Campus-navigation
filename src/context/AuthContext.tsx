import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthSession, UserRole } from '../types';
import { authService } from '../api/auth.service';

interface AuthContextType {
  session: AuthSession;
  isLoading: boolean;
  loginAsDemoAdmin: (role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession>({
    user: null,
    token: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    authService.getSession().then((res) => {
      setSession(res.data);
      setIsLoading(false);
    });
  }, []);

  const loginAsDemoAdmin = async (role: UserRole = 'super_admin') => {
    setIsLoading(true);
    const res = await authService.loginAsDemoAdmin(role);
    setSession(res.data);
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    await authService.logout();
    setSession({ user: null, token: null, isAuthenticated: false });
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, loginAsDemoAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
