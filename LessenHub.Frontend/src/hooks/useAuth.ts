'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext, type AuthUser } from '@/contexts/AuthContext';

export type { AuthUser };

interface UseAuthResult {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(redirectToLogin: boolean = true): UseAuthResult {
  const { user, isLoading, isAuthenticated } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && redirectToLogin) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, redirectToLogin, router]);

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}
