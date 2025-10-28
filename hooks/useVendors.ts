import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { vendorsAPI } from '@/lib/api';
import type {
  CreateVendorRequest,
  UpdateVendorRequest,
  Vendor,
} from '@/types/api';

export const useVendors = () =>
  useQuery<Vendor[]>(['vendors'], async () => {
    const response = await vendorsAPI.getAll();
    return response.data;
  });

export const useVendor = (id: string) =>
  useQuery<Vendor>(
    ['vendor', id],
    async () => {
      const response = await vendorsAPI.getById(id);
      return response.data;
    },
    { enabled: !!id },
  );

export const useCreateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation((data: CreateVendorRequest) => vendorsAPI.create(data), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};

export const useUpdateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ id, data }: { id: string; data: UpdateVendorRequest }) => vendorsAPI.update(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['vendors'] });
        queryClient.invalidateQueries({ queryKey: ['vendor', variables.id] });
      },
    },
  );
};

export const useDeleteVendor = () => {
  const queryClient = useQueryClient();

  return useMutation((id: string) => vendorsAPI.delete(id), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};
