import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { pricingAPI } from '@/lib/api';
import type { Discount, PricingRates } from '@/types/api';

export const usePricingRates = () =>
  useQuery<PricingRates>(['pricing', 'rates'], async () => {
    const response = await pricingAPI.getRates();
    return response.data;
  });

export const usePricingDiscounts = () =>
  useQuery<Discount[]>(['pricing', 'discounts'], async () => {
    const response = await pricingAPI.getDiscounts();
    return response.data;
  });

export const useUpdateRates = () => {
  const queryClient = useQueryClient();

  return useMutation((data: Partial<PricingRates>) => pricingAPI.updateRates(data), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing', 'rates'] });
    },
  });
};

export const useCreateDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation((data: Omit<Discount, 'id'>) => pricingAPI.createDiscount(data), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing', 'discounts'] });
    },
  });
};

export const useUpdateDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ id, data }: { id: string; data: Partial<Discount> }) => pricingAPI.updateDiscount(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['pricing', 'discounts'] });
        queryClient.invalidateQueries({ queryKey: ['pricing', 'discount', variables.id] });
      },
    },
  );
};

export const useDeleteDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation((id: string) => pricingAPI.deleteDiscount(id), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing', 'discounts'] });
    },
  });
};
