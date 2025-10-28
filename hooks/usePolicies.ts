import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { policiesAPI } from '@/lib/api';
import type { PolicyListResponse, PolicyRecord, PolicyUpdatePayload } from '@/types/api';

export type PolicyFilters = {
  status?: string;
  product?: string;
  q?: string;
  userId?: string;
  policyNumber?: string;
  page?: number;
  pageSize?: number;
};

export const usePolicies = (filters?: PolicyFilters) =>
  useQuery<PolicyListResponse>(
    ['policies', filters],
    async () => {
      const response = await policiesAPI.list(filters);
      return response.data;
    },
    { keepPreviousData: true },
  );

export const usePolicy = (policyId?: number) =>
  useQuery<PolicyRecord>(
    ['policy', policyId],
    async () => {
      if (!policyId) throw new Error('policyId is required');
      const response = await policiesAPI.getById(policyId);
      return response.data;
    },
    { enabled: typeof policyId === 'number' },
  );

export const useUpdatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ policyId, payload }: { policyId: number; payload: PolicyUpdatePayload }) =>
      policiesAPI.update(policyId, payload),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['policies'] });
        queryClient.invalidateQueries({ queryKey: ['policy', variables.policyId] });
      },
    },
  );
};

export const useDeletePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation((policyId: number) => policiesAPI.remove(policyId), {
    onSuccess: (_, policyId) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.removeQueries({ queryKey: ['policy', policyId] });
    },
  });
};
