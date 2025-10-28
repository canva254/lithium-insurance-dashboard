import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { automationAPI } from '@/lib/api';
import type {
  AutomationJob,
  AutomationJobCreatePayload,
  AutomationJobUpdatePayload,
  AutomationRun,
} from '@/types/api';

const JOB_KEYS = {
  all: ['automationJobs'] as const,
  list: (params?: { tenant_id?: string; status?: string }) => ['automationJobs', params] as const,
  detail: (jobId: string) => ['automationJob', jobId] as const,
  runs: (jobId: string) => ['automationJob', jobId, 'runs'] as const,
};

export const useAutomationJobs = (params?: { tenant_id?: string; status?: string }) =>
  useQuery<AutomationJob[]>(JOB_KEYS.list(params), async () => {
    const response = await automationAPI.listJobs(params);
    return response.data ?? [];
  });

export const useAutomationRuns = (jobId: string, enabled = true) =>
  useQuery<AutomationRun[]>(
    JOB_KEYS.runs(jobId),
    async () => {
      const response = await automationAPI.listRuns(jobId);
      return response.data ?? [];
    },
    { enabled },
  );

export const useCreateAutomationJob = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: AutomationJobCreatePayload) => {
      const response = await automationAPI.createJob(payload);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: JOB_KEYS.all });
      },
    },
  );
};

export const useUpdateAutomationJob = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ jobId, payload }: { jobId: string; payload: AutomationJobUpdatePayload }) => {
      const response = await automationAPI.updateJob(jobId, payload);
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: JOB_KEYS.all });
        if (data?.id) {
          queryClient.invalidateQueries({ queryKey: JOB_KEYS.detail(data.id) });
        }
      },
    },
  );
};

export const useDeleteAutomationJob = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (jobId: string) => {
      const response = await automationAPI.deleteJob(jobId);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: JOB_KEYS.all });
      },
    },
  );
};

export const useRecordAutomationRun = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ jobId, payload }: { jobId: string; payload: { status: string; message?: string; jobStatus?: string } }) => {
      const response = await automationAPI.recordRun(jobId, payload);
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: JOB_KEYS.all });
        if (data?.id) {
          queryClient.invalidateQueries({ queryKey: JOB_KEYS.detail(data.id) });
          queryClient.invalidateQueries({ queryKey: JOB_KEYS.runs(data.id) });
        }
      },
    },
  );
};
