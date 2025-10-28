import { useMutation, useQuery } from '@tanstack/react-query';

import { workflowAPI } from '@/lib/api';
import type {
  WorkflowDetail,
  WorkflowListItem,
  WorkflowQuoteStatus,
  WorkflowSession,
  WorkflowSubmitResponse,
} from '@/types/api';

export const useWorkflowList = () =>
  useQuery<WorkflowListItem[]>(['workflows'], async () => {
    const response = await workflowAPI.list();
    return response.data;
  });

export const useWorkflowDetail = (key?: string, enabled = true) =>
  useQuery<WorkflowDetail>(
    ['workflow', key],
    async () => {
      if (!key) throw new Error('workflow_key_required');
      const response = await workflowAPI.get(key);
      return response.data;
    },
    { enabled: enabled && !!key },
  );

export const useCreateWorkflowSession = () =>
  useMutation((variables: { key: string; initialData?: Record<string, unknown> }) =>
    workflowAPI.createSession(variables.key, variables.initialData ?? {}),
  );

export const usePatchWorkflowSession = () =>
  useMutation((variables: { sessionId: string; dataPatch: Record<string, unknown> }) =>
    workflowAPI.patchSession(variables.sessionId, variables.dataPatch),
  );

export const useSubmitWorkflowSession = () =>
  useMutation((sessionId: string) => workflowAPI.submitSession(sessionId));

export const useWorkflowQuote = () =>
  useMutation((quoteId: string) => workflowAPI.getQuote(quoteId));
