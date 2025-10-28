'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePartnerNotifications, usePartnerPackages } from '@/hooks/usePartnerPackages';

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
};

export default function PartnerDashboardPage() {
  const { data: packages = [], isLoading } = usePartnerPackages({ include_versions: true, include_documents: true });
  const { data: notifications = [], isLoading: notificationsLoading } = usePartnerNotifications();

  const metrics = useMemo(() => {
    const pendingReview = packages.filter((pkg) => pkg.workflowState === 'pending_review').length;
    const approved = packages.filter((pkg) => pkg.workflowState === 'approved').length;
    const drafts = packages.filter((pkg) => pkg.workflowState === 'draft' || !pkg.workflowState).length;
    const documents = packages.reduce((total, pkg) => total + (pkg.documents?.length ?? 0), 0);

    return [
      { label: 'Total packages', value: packages.length },
      { label: 'Pending review', value: pendingReview },
      { label: 'Draft packages', value: drafts },
      { label: 'Approved packages', value: approved },
      { label: 'Supporting documents', value: documents },
    ];
  }, [packages]);

  const recentActivities = useMemo(() => {
    const entries = packages.flatMap((pkg) =>
      (pkg.versions ?? []).map((version) => ({
        id: version.id,
        packageId: pkg.id,
        packageName: pkg.name,
        version: version.version ?? 0,
        status: version.status,
        createdAt: version.createdAt ?? pkg.updatedAt ?? version.submittedAt ?? null,
      })),
    );

    return entries
      .filter((entry) => entry.createdAt)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 6);
  }, [packages]);

  const unreadNotifications = notifications.filter((notification) => notification.status !== 'read').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Partner overview</h1>
          <p className="text-sm text-muted-foreground">
            Review package progress, outstanding submissions, and notifications at a glance.
          </p>
        </div>
        <Link
          href="/partner/packages/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          Create package
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{metric.label}</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</div>
          </div>
        ))}
        <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notifications</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">
            {notifications.length}
            {notificationsLoading ? null : (
              <span className="ml-2 text-sm font-medium text-muted-foreground">({unreadNotifications} unread)</span>
            )}
          </div>
          <Link href="/partner/notifications" className="mt-2 inline-block text-sm font-medium text-primary underline">
            Review notifications
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Submission activity</h2>
            <p className="text-sm text-muted-foreground">Latest package drafts and review outcomes.</p>
          </div>
          <Link href="/partner/packages" className="text-sm font-medium text-primary underline">
            View all packages
          </Link>
        </div>
        {recentActivities.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No submissions yet. Start by creating a package.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-md border border-border/60 bg-background px-4 py-3 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-foreground">{activity.packageName}</div>
                  <Badge variant="outline" className="capitalize">
                    v{activity.version} · {activity.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDate(activity.createdAt)}</span>
                  <Link
                    href={`/partner/packages/${activity.packageId}`}
                    className="text-sm font-medium text-primary underline"
                  >
                    View details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Document readiness</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ensure each package includes the latest supporting documents before submitting for approval.
        </p>
        <div className="mt-4 space-y-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-foreground">{pkg.name}</p>
                <p className="text-xs text-muted-foreground">
                  {pkg.documents?.length ? `${pkg.documents.length} documents attached` : 'No documents uploaded yet'}
                </p>
              </div>
              <Link href={`/partner/packages/${pkg.id}`} className="text-sm font-medium text-primary underline">
                Manage
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
