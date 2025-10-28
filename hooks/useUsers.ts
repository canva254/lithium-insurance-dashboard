import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usersAPI } from '@/lib/api';
import type {
  AdminUser,
  CreateAdminUserPayload,
  ResetAdminUserPayload,
  UpdateAdminUserPayload,
  UpdateAdminUserStatusPayload,
  AdminUserRole,
} from '@/types/api';

export type UserFilters = {
  search?: string;
  role?: AdminUserRole | 'all';
  status?: 'all' | 'active' | 'inactive';
};

const serializeFilters = (filters?: UserFilters) => {
  if (!filters) return undefined;
  const query: Record<string, string> = {};
  if (filters.search) query.search = filters.search;
  if (filters.role && filters.role !== 'all') query.role = filters.role;
  if (filters.status && filters.status !== 'all') query.status = filters.status;
  return query;
};

export const useUsers = (filters?: UserFilters) =>
  useQuery<AdminUser[]>(['users', filters], async () => {
    const params = serializeFilters(filters);
    const response = await usersAPI.getAll(params);
    return response.data;
  });

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation((payload: CreateAdminUserPayload) => usersAPI.create(payload), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, data }: { id: string; data: UpdateAdminUserPayload }) => usersAPI.update(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['user', variables.id] });
      },
    },
  );
};

export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, data }: { id: string; data: UpdateAdminUserStatusPayload }) => usersAPI.updateStatus(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['user', variables.id] });
      },
    },
  );
};

export const useResetUserPassword = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, data }: { id: string; data: ResetAdminUserPayload }) => usersAPI.resetPassword(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['user', variables.id] });
      },
    },
  );
};
