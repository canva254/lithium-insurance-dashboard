import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { packagesAPI } from '@/lib/api';
import type {
  CreatePackageRequest,
  FilterParams,
  InsurancePackage,
  PackageVersionDecisionRequest,
  PackageVersionDraftRequest,
  PackageVersionSubmitRequest,
  PackageBulkActionRequest,
  PolicyDocument,
  UpdatePackageRequest,
} from '@/types/api';

type PackageFilters = Pick<
  FilterParams,
  'search' | 'status' | 'category' | 'sortBy' | 'sortOrder' | 'vendorId' | 'workflowState'
>;

export const usePackages = (filters?: PackageFilters) =>
  useQuery<InsurancePackage[]>(['packages', filters], async () => {
    const response = await packagesAPI.getAll(filters);
    return response.data;
  });

export const usePackage = (id: string) =>
  useQuery<InsurancePackage>(
    ['package', id],
    async () => {
      const response = await packagesAPI.getById(id);
      return response.data;
    },
    { enabled: !!id },
  );

export const useCreatePackage = () => {
  const queryClient = useQueryClient();

  return useMutation((data: CreatePackageRequest) => packagesAPI.create(data), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
};

export const useUpdatePackage = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ id, data }: { id: string; data: UpdatePackageRequest }) => packagesAPI.update(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['packages'] });
        queryClient.invalidateQueries({ queryKey: ['package', variables.id] });
      },
    },
  );
};

export const useDeletePackage = () => {
  const queryClient = useQueryClient();

  return useMutation((id: string) => packagesAPI.delete(id), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
};

export const usePackageDocuments = (packageId: string) =>
  useQuery<PolicyDocument[]>(
    ['package', packageId, 'documents'],
    async () => {
      const response = await packagesAPI.listDocuments(packageId);
      return response.data;
    },
    { enabled: !!packageId },
  );

export const useUploadPackageDocument = () => {
  const queryClient = useQueryClient();

  return useMutation(
    async ({ packageId, file }: { packageId: string; file: File }) =>
      packagesAPI.uploadDocument(packageId, file),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['package', variables.packageId, 'documents'] });
        queryClient.invalidateQueries({ queryKey: ['package', variables.packageId] });
        queryClient.invalidateQueries({ queryKey: ['packages'] });
      },
    },
  );
};

export const useDeletePackageDocument = () => {
  const queryClient = useQueryClient();

  return useMutation(
    async ({ packageId, documentId }: { packageId: string; documentId: string }) =>
      packagesAPI.deleteDocument(packageId, documentId),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['package', variables.packageId, 'documents'] });
        queryClient.invalidateQueries({ queryKey: ['package', variables.packageId] });
        queryClient.invalidateQueries({ queryKey: ['packages'] });
      },
    },
  );
};

export const useCreatePackageVersion = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ packageId, data }: { packageId: string; data: PackageVersionDraftRequest }) =>
      packagesAPI.createVersion(packageId, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['packages'] });
        queryClient.invalidateQueries({ queryKey: ['package', variables.packageId] });
      },
    },
  );
};

export const useSubmitPackageVersion = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ packageId, versionId, data }: { packageId: string; versionId: string; data?: PackageVersionSubmitRequest }) =>
      packagesAPI.submitVersion(packageId, versionId, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['packages'] });
        queryClient.invalidateQueries({ queryKey: ['package', variables.packageId] });
      },
    },
  );
};

export const useApprovePackageVersion = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ packageId, versionId }: { packageId: string; versionId: string }) =>
      packagesAPI.approveVersion(packageId, versionId),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['packages'] });
        queryClient.invalidateQueries({ queryKey: ['package', variables.packageId] });
      },
    },
  );
};

export const useRejectPackageVersion = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({
      packageId,
      versionId,
      data,
    }: {
      packageId: string;
      versionId: string;
      data: PackageVersionDecisionRequest;
    }) => packagesAPI.rejectVersion(packageId, versionId, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['packages'] });
        queryClient.invalidateQueries({ queryKey: ['package', variables.packageId] });
      },
    },
  );
};

export const useBulkPackageAction = () => {
  const queryClient = useQueryClient();
  return useMutation((data: PackageBulkActionRequest) => packagesAPI.bulk(data), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
};
