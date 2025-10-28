import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { partnerAPI } from '@/lib/api';
import type {
  PartnerPackage,
  PartnerPackageCreateRequest,
  PartnerPackageDocument,
  PartnerPackageVersion,
  PartnerPackageVersionDraftRequest,
  PartnerPackageSubmitRequest,
  PartnerNotification,
} from '@/types/api';

type PartnerPackagesParams = {
  include_documents?: boolean;
  include_versions?: boolean;
  vendor_id?: string;
  tenant_id?: string;
};

export const usePartnerPackages = (params?: PartnerPackagesParams) =>
  useQuery<PartnerPackage[]>(['partner-packages', params], async () => {
    const response = await partnerAPI.listPackages(params);
    return response.data ?? [];
  });

export const usePartnerPackage = (packageId: string, params?: { tenant_id?: string }) =>
  useQuery<PartnerPackage>(
    ['partner-package', packageId, params],
    async () => {
      const response = await partnerAPI.getPackage(packageId, params);
      return response.data;
    },
    { enabled: Boolean(packageId) },
  );

export const usePartnerPackageVersions = (packageId: string, params?: { tenant_id?: string }) =>
  useQuery<PartnerPackageVersion[]>(
    ['partner-package', packageId, 'versions', params],
    async () => {
      const response = await partnerAPI.listPackageVersions(packageId, params);
      return response.data ?? [];
    },
    { enabled: Boolean(packageId) },
  );

export const usePartnerPackageDocuments = (packageId: string, params?: { tenant_id?: string }) =>
  useQuery<PartnerPackageDocument[]>(
    ['partner-package', packageId, 'documents', params],
    async () => {
      const response = await partnerAPI.listPackageDocuments(packageId, params);
      return response.data ?? [];
    },
    { enabled: Boolean(packageId) },
  );

export const useCreatePartnerPackage = () => {
  const queryClient = useQueryClient();

  return useMutation((payload: PartnerPackageCreateRequest) => partnerAPI.createPackage(payload), {
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['partner-packages'] });
      if (response.data?.id) {
        queryClient.invalidateQueries({ queryKey: ['partner-package', response.data.id] });
      }
    },
  });
};

export const useCreatePartnerPackageVersion = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ packageId, payload }: { packageId: string; payload: PartnerPackageVersionDraftRequest }) =>
      partnerAPI.createPackageVersion(packageId, payload),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['partner-packages'] });
        queryClient.invalidateQueries({ queryKey: ['partner-package', variables.packageId] });
        queryClient.invalidateQueries({ queryKey: ['partner-package', variables.packageId, 'versions'] });
      },
    },
  );
};

export const useUpdatePartnerPackageVersion = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({
      packageId,
      versionId,
      payload,
    }: {
      packageId: string;
      versionId: string;
      payload: PartnerPackageVersionDraftRequest;
    }) => partnerAPI.updatePackageVersion(packageId, versionId, payload),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['partner-packages'] });
        queryClient.invalidateQueries({ queryKey: ['partner-package', variables.packageId] });
        queryClient.invalidateQueries({ queryKey: ['partner-package', variables.packageId, 'versions'] });
      },
    },
  );
};

export const useSubmitPartnerPackageVersion = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({
      packageId,
      versionId,
      payload,
    }: {
      packageId: string;
      versionId: string;
      payload?: PartnerPackageSubmitRequest;
    }) => partnerAPI.submitPackageVersion(packageId, versionId, payload),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['partner-packages'] });
        queryClient.invalidateQueries({ queryKey: ['partner-package', variables.packageId] });
        queryClient.invalidateQueries({ queryKey: ['partner-package', variables.packageId, 'versions'] });
      },
    },
  );
};

export const useUploadPartnerPackageDocument = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ packageId, file }: { packageId: string; file: File }) => partnerAPI.uploadPackageDocument(packageId, file),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['partner-package', variables.packageId] });
        queryClient.invalidateQueries({ queryKey: ['partner-package', variables.packageId, 'documents'] });
      },
    },
  );
};

export const usePartnerNotifications = (status?: string) =>
  useQuery<PartnerNotification[]>(['partner-notifications', status], async () => {
    const response = await partnerAPI.listNotifications(status);
    return response.data ?? [];
  });

export const useMarkPartnerNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation((notificationId: string) => partnerAPI.markNotificationRead(notificationId), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-notifications'] });
    },
  });
};
