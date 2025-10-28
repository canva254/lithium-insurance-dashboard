import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authAPI } from '@/lib/api';
import type { AdminSession } from '@/types/api';

export function useTwoFactorSetup() {
  return useMutation(async () => {
    const response = await authAPI.setupTwoFactor();
    return response.data;
  });
}

export function useTwoFactorEnable() {
  return useMutation(async (code: string) => {
    const response = await authAPI.enableTwoFactor(code);
    return response.data;
  });
}

export function useTwoFactorDisable() {
  return useMutation(async (code: string) => {
    const response = await authAPI.disableTwoFactor(code);
    return response.data;
  });
}

export function useSessions() {
  return useQuery<AdminSession[]>(['security', 'sessions'], async () => {
    const response = await authAPI.listSessions();
    return response.data ?? [];
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ sessionId, reason }: { sessionId: string; reason?: string }) => {
      await authAPI.revokeSession(sessionId, reason);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['security', 'sessions'] });
      },
    },
  );
}
