import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { distributionAPI } from '@/lib/api';
import type {
  DistributionChannel,
  DistributionChannelCreatePayload,
  DistributionChannelUpdatePayload,
  DistributionChannelSyncPayload,
} from '@/types/api';

const CHANNEL_KEYS = {
  all: ['distributionChannels'] as const,
  list: (params?: { tenant_id?: string; status?: string }) => ['distributionChannels', params] as const,
  detail: (channelId: string) => ['distributionChannel', channelId] as const,
};

export const useDistributionChannels = (params?: { tenant_id?: string; status?: string }) =>
  useQuery<DistributionChannel[]>(CHANNEL_KEYS.list(params), async () => {
    const response = await distributionAPI.list(params);
    return response.data ?? [];
  });

export const useCreateDistributionChannel = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: DistributionChannelCreatePayload) => {
      const response = await distributionAPI.create(payload);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: CHANNEL_KEYS.all });
      },
    },
  );
};

export const useUpdateDistributionChannel = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ channelId, payload }: { channelId: string; payload: DistributionChannelUpdatePayload }) => {
      const response = await distributionAPI.update(channelId, payload);
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: CHANNEL_KEYS.all });
        if (data?.id) {
          queryClient.invalidateQueries({ queryKey: CHANNEL_KEYS.detail(data.id) });
        }
      },
    },
  );
};

export const useDeleteDistributionChannel = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (channelId: string) => {
      const response = await distributionAPI.remove(channelId);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: CHANNEL_KEYS.all });
      },
    },
  );
};

export const useLogDistributionSync = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ channelId, payload }: { channelId: string; payload: DistributionChannelSyncPayload }) => {
      const response = await distributionAPI.logSync(channelId, payload);
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: CHANNEL_KEYS.all });
        if (data?.id) {
          queryClient.invalidateQueries({ queryKey: CHANNEL_KEYS.detail(data.id) });
        }
      },
    },
  );
};
