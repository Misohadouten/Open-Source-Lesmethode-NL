'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface AuthUser {
  isAuthenticated: boolean;
  email?: string;
  name?: string;
  docentId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7207';
      const response = await fetch(`${backendUrl}/api/auth/me`, {
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        if (userData.isAuthenticated) {
          setUser(userData);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: user?.isAuthenticated ?? false,
      refresh,
    }),
    [user, isLoading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
