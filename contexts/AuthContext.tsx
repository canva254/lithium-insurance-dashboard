"use client";

import { ReactNode } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user ?? null,
    loading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    login: ({ email, password }: { email: string; password: string }) =>
      signIn('credentials', { redirect: false, email, password }),
    logout: () => signOut({ callbackUrl: '/login' }),
  };
}
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { authAPI } from '@/lib/api';
import type { LoginRequest, User } from '@/types/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const initialize = async () => {
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('admin_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profile = await authAPI.getProfile();
        setUser(profile.data);
      } catch (error) {
        console.error('Failed to load profile', error);
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const response = await authAPI.login(credentials);
      const { accessToken, refreshToken, user } = response.data;

      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_token', accessToken);
        localStorage.setItem('admin_refresh_token', refreshToken);
      }

      setUser(user);
      queryClient.clear();
      router.replace('/dashboard');
    },
    [queryClient, router],
  );

  const logout = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const refresh = localStorage.getItem('admin_refresh_token');
      if (refresh) {
        try {
          await authAPI.logout(refresh);
        } catch (error) {
          console.error('Logout failed', error);
        }
      }

      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
    }

    setUser(null);
    queryClient.clear();
    router.replace('/login');
  }, [queryClient, router]);

  const refreshToken = useCallback(async () => {
    if (typeof window === 'undefined') return null;
    const refresh = localStorage.getItem('admin_refresh_token');
    if (!refresh) return null;

    try {
      const response = await authAPI.refreshToken(refresh);
      const { accessToken, refreshToken: newRefresh } = response.data;
      localStorage.setItem('admin_token', accessToken);
      localStorage.setItem('admin_refresh_token', newRefresh);
      return accessToken;
    } catch (error) {
      console.error('Refresh token failed', error);
      await logout();
      return null;
    }
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshToken,
    }),
    [loading, login, logout, refreshToken, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
