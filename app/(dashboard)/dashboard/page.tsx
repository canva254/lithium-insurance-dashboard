'use client';

import { useMemo } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';

import { useOverviewStats, usePolicyStats, useSalesData } from '@/hooks/useAnalytics';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Title);

export default function DashboardPage() {
  const overviewQuery = useOverviewStats();
  const salesQuery = useSalesData('monthly');
  const policyStatsQuery = usePolicyStats();

  const isLoading = overviewQuery.isLoading || salesQuery.isLoading || policyStatsQuery.isLoading;

  const policyDistribution = useMemo(() => {
    const stats = policyStatsQuery.data?.policiesByCategory ?? [];
    return {
      labels: stats.map((item) => item.category ?? 'Unknown'),
      values: stats.map((item) => item.count ?? 0),
    };
  }, [policyStatsQuery.data]);

  const salesData = useMemo(() => {
    const sales = salesQuery.data ?? [];
    return {
      labels: sales.map((item) => item.date),
      values: sales.map((item) => item.revenue ?? 0),
    };
  }, [salesQuery.data]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(value);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  const overview = overviewQuery.data ?? {
    totalPolicies: 0,
    activePolicies: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    topPackages: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time insight into policies, revenue, and portfolio distribution.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total policies" value={overview.totalPolicies} subtitle={`${overview.monthlyGrowth}% from last month`} />
        <StatCard
          title="Active policies"
          value={overview.activePolicies}
          subtitle={`${overview.totalPolicies ? Math.round((overview.activePolicies / overview.totalPolicies) * 100) : 0}% active`}
        />
        <StatCard title="Total revenue" value={formatCurrency(overview.totalRevenue)} subtitle="Year to date" />
        <StatCard title="Monthly growth" value={`${overview.monthlyGrowth}%`} subtitle="vs last month" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Sales overview</h2>
              <p className="text-xs text-muted-foreground">Monthly revenue trend</p>
            </div>
          </div>
          <div className="mt-6">
            <Line
              data={{
                labels: salesData.labels,
                datasets: [
                  {
                    label: 'Revenue (KES)',
                    data: salesData.values,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    tension: 0.3,
                    fill: true,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (value) => formatCurrency(Number(value)).replace('KES', ''),
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Policy distribution</h2>
          <p className="text-xs text-muted-foreground">Breakdown by category</p>
          <div className="mt-6">
            <Pie
              data={{
                labels: policyDistribution.labels,
                datasets: [
                  {
                    data: policyDistribution.values,
                    backgroundColor: ['#2563eb', '#f97316', '#10b981', '#8b5cf6'],
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Top performing packages</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(overview.topPackages ?? []).map((pkg) => (
            <div key={pkg.name} className="rounded-lg border border-border/60 bg-background px-4 py-3">
              <p className="text-sm font-medium text-foreground">{pkg.name}</p>
              <p className="text-xs text-muted-foreground">{pkg.count} active policies</p>
            </div>
          ))}
          {!overview.topPackages?.length && (
            <p className="text-sm text-muted-foreground">No package data available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: number | string; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
