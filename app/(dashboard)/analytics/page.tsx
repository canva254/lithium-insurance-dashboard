'use client';

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';

import {
  useAnalyticsSummary,
  useAnalyticsEvents,
  useRealtimeAnalytics,
} from '@/hooks/useAnalytics';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Title);

const currencyFormatter = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
});

export default function AnalyticsPage() {
  const summaryQuery = useAnalyticsSummary();
  const eventsQuery = useAnalyticsEvents(50);
  const queryClient = useQueryClient();

  useRealtimeAnalytics(() => {
    queryClient.invalidateQueries({ queryKey: ['analytics', 'summary'] });
    queryClient.invalidateQueries({ queryKey: ['analytics', 'events', 50] });
  });

  const isLoading = summaryQuery.isLoading || eventsQuery.isLoading;
  const summary = summaryQuery.data;
  const recentEvents = eventsQuery.data ?? [];

  const chartData = useMemo(() => {
    const points = summary?.eventsByDay ?? [];
    const labels = points.map((item) => item.date);
    const values = points.map((item) => item.count);
    return {
      labels,
      datasets: [
        {
          label: 'Events',
          data: values,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          tension: 0.25,
          fill: true,
        },
      ],
    };
  }, [summary?.eventsByDay]);

  if (isLoading && (!summaryQuery.data || !eventsQuery.data)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  const topEvents = summary?.topEvents ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Advanced analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live metrics for policy governance, vendor performance, and security posture.
        </p>
      </div>

      {summary ? (
        <div className="grid gap-4 xl:grid-cols-4">
          <StatCard
            title="Active packages"
            value={summary.packages.active}
            subtitle={`Pending review: ${summary.packages.pendingReview}`}
          />
          <StatCard
            title="Approvals (7d)"
            value={summary.packages.approvalsLast7Days}
            subtitle={`Total packages: ${summary.packages.total}`}
          />
          <StatCard
            title="Vendors"
            value={summary.vendors.active}
            subtitle={`New this month: ${summary.vendors.newThisMonth}`}
          />
          <StatCard
            title="Secured admins"
            value={`${summary.security.twoFactorEnabled}/${summary.security.totalAdmins}`}
            subtitle={`Active sessions: ${summary.security.activeSessions}`}
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Event volume</h2>
              <p className="text-xs text-muted-foreground">7 day trend of tracked governance activity</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {summary?.eventsLast24h ?? 0} events / 24h
            </span>
          </div>
          <div className="mt-6">
            <Line
              data={chartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Top signals</h2>
          <p className="text-xs text-muted-foreground">Most frequent events in the last 7 days</p>
          <div className="mt-4 space-y-3">
            {topEvents.length ? (
              topEvents.map((item) => (
                <div key={item.event} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-foreground">{formatEventName(item.event)}</p>
                    <p className="text-xs text-muted-foreground">{item.event}</p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {item.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Activity stream</h2>
              <p className="text-xs text-muted-foreground">Real-time feed of administrative actions</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {recentEvents.length ? (
              recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-border/60 bg-background px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{formatEventName(event.event)}</p>
                      <p className="text-xs text-muted-foreground">{event.namespace ?? 'admin'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {Object.keys(event.payload ?? {}).length ? (
                    <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted/40 p-2 text-xs text-muted-foreground">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No events yet. Actions will appear here.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Highlights</h2>
          <div className="mt-3 space-y-3 text-sm text-foreground">
            <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Policy coverage</p>
              <p className="mt-1 font-semibold">
                {summary ? `${summary.packages.active}/${summary.packages.total}` : '—'} active packages
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Two-factor adoption</p>
              <p className="mt-1 font-semibold">
                {summary ? `${summary.security.twoFactorEnabled}/${summary.security.totalAdmins}` : '—'} admins secured
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendor footprint</p>
              <p className="mt-1 font-semibold">
                {summary ? `${summary.vendors.active}/${summary.vendors.total}` : '—'} vendors active
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue indicator</p>
              <p className="mt-1 font-semibold">{currencyFormatter.format(recentEvents.length * 1500)}</p>
              <p className="text-xs text-muted-foreground">Mock projection per live event</p>
            </div>
          </div>
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

function formatEventName(event: string) {
  return event
    .split('.')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).replace(/_/g, ' '))
    .join(' • ');
}
