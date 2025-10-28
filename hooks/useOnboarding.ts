import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { onboardingAPI, partnerAPI } from '@/lib/api';
import type {
  PartnerOnboardingRequest,
  PartnerOnboardingCreatePayload,
  PartnerOnboardingUpdatePayload,
  PartnerOnboardingDecisionPayload,
  PartnerOnboardingSubmitPayload,
} from '@/types/api';

type OnboardingListParams = {
  status?: string;
  tenant_id?: string;
  user_id?: string;
  limit?: number;
};

const ONBOARDING_KEYS = {
  all: ['onboarding'] as const,
  list: (params?: OnboardingListParams) => ['onboarding', 'list', params] as const,
  detail: (requestId: string) => ['onboarding', 'detail', requestId] as const,
  partner: ['partner', 'onboarding'] as const,
};

export const useOnboardingRequests = (params?: OnboardingListParams) =>
  useQuery<PartnerOnboardingRequest[]>(ONBOARDING_KEYS.list(params), async () => {
    const response = await onboardingAPI.list(params);
    return response.data ?? [];
  });

export const useCreateOnboardingRequest = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: PartnerOnboardingCreatePayload) => {
      const response = await onboardingAPI.create(payload);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ONBOARDING_KEYS.all });
      },
    },
  );
};

export const useUpdateOnboardingRequest = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ requestId, payload }: { requestId: string; payload: PartnerOnboardingUpdatePayload }) => {
      const response = await onboardingAPI.update(requestId, payload);
      return response.data;
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ONBOARDING_KEYS.all });
        queryClient.invalidateQueries({ queryKey: ONBOARDING_KEYS.detail(variables.requestId) });
      },
    },
  );
};

export const useApproveOnboardingRequest = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ requestId, payload }: { requestId: string; payload?: PartnerOnboardingDecisionPayload }) => {
      const response = await onboardingAPI.approve(requestId, payload);
      return response.data;
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ONBOARDING_KEYS.all });
        queryClient.invalidateQueries({ queryKey: ONBOARDING_KEYS.detail(variables.requestId) });
      },
    },
  );
};

export const useRejectOnboardingRequest = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ requestId, payload }: { requestId: string; payload: PartnerOnboardingDecisionPayload }) => {
      const response = await onboardingAPI.reject(requestId, payload);
      return response.data;
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ONBOARDING_KEYS.all });
        queryClient.invalidateQueries({ queryKey: ONBOARDING_KEYS.detail(variables.requestId) });
      },
    },
  );
};

export const usePartnerOnboardingRequest = () =>
  useQuery<PartnerOnboardingRequest | null>(ONBOARDING_KEYS.partner, async () => {
    const response = await partnerAPI.getOnboardingRequest();
    return response.data ?? null;
  });

export const useSavePartnerOnboardingDraft = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: PartnerOnboardingSubmitPayload) => {
      const response = await partnerAPI.saveOnboardingDraft(payload);
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.setQueryData(ONBOARDING_KEYS.partner, data ?? null);
      },
    },
  );
};

export const useSubmitPartnerOnboarding = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: PartnerOnboardingSubmitPayload) => {
      const response = await partnerAPI.submitOnboarding(payload);
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.setQueryData(ONBOARDING_KEYS.partner, data ?? null);
      },
    },
  );
};
