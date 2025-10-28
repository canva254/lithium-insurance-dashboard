import { useQuery } from '@tanstack/react-query';

import { reviewAPI } from '@/lib/api';
import type { PendingPackageReview } from '@/types/api';

export const usePendingPackageReviews = (params?: { tenant_id?: string; limit?: number }) =>
  useQuery<PendingPackageReview[]>(['pending-package-reviews', params], async () => {
    const response = await reviewAPI.listPendingPackageReviews(params);
    return response.data ?? [];
  });
