import { QueryClient } from '@tanstack/react-query';

const DEFAULT_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const DEFAULT_GC_TIME = 10 * 60 * 1000; // 10 minutes

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME,
      cacheTime: DEFAULT_GC_TIME,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      keepPreviousData: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
