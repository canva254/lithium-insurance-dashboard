import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import analyticsSummaryMock from '@/app/api-mocks/analytics-summary.json';
import analyticsEventsMock from '@/app/api-mocks/analytics-events.json';
import { analyticsAPI, API_BASE_URL } from '@/lib/api';
import type { AnalyticsOverview, AnalyticsSummary, AnalyticsEvent, SalesData, UserStats } from '@/types/api';

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

const MOCK_OVERVIEW: AnalyticsOverview = {
  totalPolicies: 1280,
  activePolicies: 1042,
  totalRevenue: 125_000_000,
  monthlyGrowth: 12,
  topPackages: [
    { name: 'Executive Health Shield', count: 312 },
    { name: 'Fleet Motor Comprehensive', count: 224 },
    { name: 'SME Cyber Risk', count: 187 },
    { name: 'Global Travel Elite', count: 144 },
  ],
};

const MOCK_SALES: SalesData[] = Array.from({ length: 6 }).map((_, index) => {
  const month = new Date();
  month.setMonth(month.getMonth() - (5 - index));
  return {
    date: month.toISOString().slice(0, 7),
    policies: 150 + index * 12,
    revenue: 18_000_000 + index * 1_750_000,
  };
});

const MOCK_POLICY_STATS = {
  policiesByCategory: [
    { category: 'Health', count: 420 },
    { category: 'Motor', count: 365 },
    { category: 'Travel', count: 210 },
    { category: 'Business', count: 175 },
  ],
};

const MOCK_SUMMARY = analyticsSummaryMock as AnalyticsSummary;
const MOCK_EVENTS = analyticsEventsMock as AnalyticsEvent[];

export const useOverviewStats = () =>
  useQuery<AnalyticsOverview>(
    ['analytics', 'overview'],
    async () => {
      const response = await analyticsAPI.getOverview();
      return response.data;
    },
    {
      enabled: !BYPASS_AUTH,
      initialData: BYPASS_AUTH ? MOCK_OVERVIEW : undefined,
      staleTime: BYPASS_AUTH ? Infinity : undefined,
    },
  );

export const useSalesData = (period = 'monthly') =>
  useQuery<SalesData[]>(
    ['analytics', 'sales', period],
    async () => {
      const response = await analyticsAPI.getSales(period);
      return response.data;
    },
    {
      enabled: !BYPASS_AUTH,
      initialData: BYPASS_AUTH ? MOCK_SALES : undefined,
      staleTime: BYPASS_AUTH ? Infinity : undefined,
    },
  );

export const useUserStats = () =>
  useQuery<UserStats>(
    ['analytics', 'user-stats'],
    async () => {
      const response = await analyticsAPI.getUserStats();
      return response.data;
    },
    {
      enabled: !BYPASS_AUTH,
      staleTime: BYPASS_AUTH ? Infinity : undefined,
    },
  );

export const usePolicyStats = (params?: { startDate?: string; endDate?: string }) =>
  useQuery(
    ['analytics', 'policy-stats', params],
    async () => {
      const response = await analyticsAPI.getPolicyStats(params);
      return response.data as { policiesByCategory?: { category: string; count: number }[] };
    },
    {
      enabled: !BYPASS_AUTH,
      initialData: BYPASS_AUTH ? MOCK_POLICY_STATS : undefined,
      staleTime: BYPASS_AUTH ? Infinity : undefined,
    },
  );

export const useAnalyticsSummary = () =>
  useQuery<AnalyticsSummary>(
    ['analytics', 'summary'],
    async () => {
      const response = await analyticsAPI.getSummary();
      return response.data;
    },
    {
      enabled: !BYPASS_AUTH,
      initialData: BYPASS_AUTH ? MOCK_SUMMARY : undefined,
      staleTime: BYPASS_AUTH ? Infinity : undefined,
    },
  );

export const useAnalyticsEvents = (limit = 50) =>
  useQuery<AnalyticsEvent[]>(
    ['analytics', 'events', limit],
    async () => {
      const response = await analyticsAPI.getEvents(limit);
      return response.data;
    },
    {
      enabled: !BYPASS_AUTH,
      initialData: BYPASS_AUTH ? MOCK_EVENTS : undefined,
      staleTime: BYPASS_AUTH ? Infinity : undefined,
    },
  );

export const useRealtimeAnalytics = (onEvent?: (event: AnalyticsEvent) => void) => {
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  const handler = useCallback(
    (event: AnalyticsEvent) => {
      onEvent?.(event);
    },
    [onEvent],
  );

  useEffect(() => {
    if (BYPASS_AUTH || !accessToken || typeof window === 'undefined') {
      return;
    }
    const token = encodeURIComponent(accessToken);
    const url = `${API_BASE_URL}/admin/analytics/stream?token=${token}`;
    let source: EventSource | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      source = new EventSource(url, { withCredentials: true });
      source.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as AnalyticsEvent;
          handler(parsed);
        } catch (error) {
          console.error('Failed to parse analytics event', error);
        }
      };
      source.onerror = () => {
        if (source) {
          source.close();
          source = null;
        }
        if (!stopped) {
          setTimeout(connect, 4000);
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      if (source) {
        source.close();
      }
    };
  }, [accessToken, handler]);
};
