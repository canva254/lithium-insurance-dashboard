'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { usePendingPackageReviews } from '@/hooks/useReviews';
import {
  usePackage,
  useApprovePackageVersion,
  useRejectPackageVersion,
} from '@/hooks/usePackages';

const workflowVariant = (state?: string) => {
  switch (state) {
    case 'approved':
      return 'default';
    case 'pending_review':
      return 'secondary';
    case 'changes_requested':
      return 'destructive';
    default:
      return 'outline';
  }
};

const workflowLabel = (state?: string) => {
  if (!state) return 'Draft';
  return state
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
};

const formatCurrency = (value?: number) => {
  if (typeof value !== 'number') return '—';
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
};

type DiffRow = {
  label: string;
  previous: string;
  current: string;
  changed: boolean;
};

const stringifyArray = (values: string[] = []) => (values.length ? values.join(', ') : '—');

export default function ReviewQueuePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  const {
    data: reviews = [],
    isLoading,
    isError,
    error,
  } = usePendingPackageReviews();

  useEffect(() => {
    if (!selectedId && reviews.length > 0) {
      setSelectedId(reviews[0].id);
    }
  }, [reviews, selectedId]);

  const selectedReview = useMemo(() => reviews.find((item) => item.id === selectedId) ?? null, [reviews, selectedId]);

  const { data: selectedPackage } = usePackage(selectedReview?.packageId ?? '');

  const approveVersion = useApprovePackageVersion();
  const rejectVersion = useRejectPackageVersion();

  const baselineVersion = useMemo(() => {
    if (!selectedPackage?.versions) return null;
    return (
      [...selectedPackage.versions]
        .filter((version) => version.status === 'approved')
        .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0] ?? null
    );
  }, [selectedPackage]);

  const diffRows: DiffRow[] = useMemo(() => {
    if (!selectedReview) return [];
    const rows: DiffRow[] = [];
    const comparableFields: Array<[
      string,
      string | undefined,
      string | undefined
    ]> = [
      ['Name', baselineVersion?.name ?? selectedPackage?.name ?? '—', selectedReview.name ?? '—'],
      ['Description', baselineVersion?.description ?? selectedPackage?.description ?? '—', selectedReview.description ?? '—'],
      ['Category', baselineVersion?.category ?? selectedPackage?.category ?? '—', selectedReview.category ?? '—'],
    ];

    comparableFields.forEach(([label, prev, curr]) => {
      const previousValue = prev ?? '—';
      const currentValue = curr ?? '—';
      rows.push({ label, previous: previousValue, current: currentValue, changed: previousValue !== currentValue });
    });

    rows.push({
      label: 'Base price',
      previous: formatCurrency(baselineVersion?.basePrice ?? selectedPackage?.basePrice),
      current: formatCurrency(selectedReview.basePrice),
      changed: (baselineVersion?.basePrice ?? selectedPackage?.basePrice) !== selectedReview.basePrice,
    });

    const previousFeatures = baselineVersion?.features ?? selectedPackage?.features ?? [];
    const currentFeatures = selectedReview.features ?? [];
    rows.push({
      label: 'Features',
      previous: stringifyArray(previousFeatures),
      current: stringifyArray(currentFeatures),
      changed:
        previousFeatures.length !== currentFeatures.length ||
        previousFeatures.some((item) => !currentFeatures.includes(item)) ||
        currentFeatures.some((item) => !previousFeatures.includes(item)),
    });

    const previousTags = baselineVersion?.tags ?? selectedPackage?.tags ?? [];
    const currentTags = selectedReview.tags ?? [];
    rows.push({
      label: 'Tags',
      previous: stringifyArray(previousTags),
      current: stringifyArray(currentTags),
      changed:
        previousTags.length !== currentTags.length ||
        previousTags.some((item) => !currentTags.includes(item)) ||
        currentTags.some((item) => !previousTags.includes(item)),
    });

    rows.push({
      label: 'Active',
      previous: baselineVersion?.isActive ?? selectedPackage?.isActive ? 'Enabled' : 'Disabled',
      current: selectedReview.isActive ? 'Enabled' : 'Disabled',
      changed: Boolean(baselineVersion?.isActive ?? selectedPackage?.isActive) !== selectedReview.isActive,
    });

    const previousVisibility = baselineVersion?.partnerVisibility ?? 'pending';
    const currentVisibility = selectedReview.partnerVisibility ?? 'pending';
    rows.push({
      label: 'Visibility',
      previous: previousVisibility,
      current: currentVisibility,
      changed: previousVisibility !== currentVisibility,
    });

    return rows;
  }, [baselineVersion, selectedPackage, selectedReview]);

  const handleApprove = async () => {
    if (!selectedReview) return;
    try {
      await approveVersion.mutateAsync({ packageId: selectedReview.packageId, versionId: selectedReview.id });
      toast({ title: 'Package approved' });
      setDecisionNotes('');
      await queryClient.invalidateQueries({ queryKey: ['pending-package-reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['package', selectedReview.packageId] });
    } catch (err: any) {
      toast({
        title: 'Approval failed',
        description: err?.message || 'Unable to approve the version. Try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!selectedReview) return;
    if (!decisionNotes.trim()) {
      toast({
        title: 'Add review notes',
        description: 'Provide a short reason outlining the requested changes.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await rejectVersion.mutateAsync({
        packageId: selectedReview.packageId,
        versionId: selectedReview.id,
        data: { reason: decisionNotes.trim() },
      });
      toast({ title: 'Changes requested', description: 'Partner has been notified.' });
      setDecisionNotes('');
      await queryClient.invalidateQueries({ queryKey: ['pending-package-reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['package', selectedReview.packageId] });
    } catch (err: any) {
      toast({
        title: 'Request failed',
        description: err?.message || 'Unable to send review notes. Try again.',
        variant: 'destructive',
      });
    }
  };

  const decisionInFlight = approveVersion.isLoading || rejectVersion.isLoading;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Review queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare submitted package versions against the current baseline, approve clean updates, or send actionable
          feedback back to partners.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-[520px] w-full" />
        </div>
      ) : isError ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(error as { message?: string } | null)?.message ?? 'Failed to load review queue.'}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-card px-6 py-16 text-center text-sm text-muted-foreground">
          Nothing pending. You’re all caught up!
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-3">
            {reviews.map((item) => {
              const isActive = item.id === selectedReview?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                    isActive ? 'border-primary bg-primary/10' : 'border-border/60 bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>v{item.versionNumber}</span>
                    <span>{formatDate(item.submittedAt)}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-foreground">{item.name ?? 'Untitled package'}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.submittedBy ? `Submitted by ${item.submittedBy}` : 'Partner submission'}
                  </p>
                </button>
              );
            })}
          </aside>

          <main className="space-y-6">
            {selectedReview ? (
              <section className="space-y-4 rounded-lg border border-border/60 bg-card p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-foreground">{selectedReview.name ?? 'Untitled package'}</h2>
                      <Badge variant={workflowVariant(selectedReview.status)} className="capitalize">
                        {workflowLabel(selectedReview.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Version {selectedReview.versionNumber} submitted by {selectedReview.submittedBy ?? 'partner'}
                    </p>
                    {selectedReview.changeSummary ? (
                      <p className="mt-3 text-sm text-muted-foreground">{selectedReview.changeSummary}</p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>Submitted {formatDate(selectedReview.submittedAt)}</div>
                    {selectedReview.tenantId ? <div>Tenant {selectedReview.tenantId}</div> : null}
                  </div>
                </div>

                <div className="rounded-md border border-border/50 bg-background p-4">
                  <h3 className="text-sm font-semibold text-foreground">Changes summary</h3>
                  <div className="mt-3 space-y-3 text-sm">
                    {diffRows.map((row) => (
                      <div key={row.label} className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">{row.label}</div>
                        <div className="grid gap-1">
                          <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Current:</span> {row.current || '—'}
                          </div>
                          <div className="rounded-md border border-border/40 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Previous:</span> {row.previous || '—'}
                          </div>
                          {row.changed ? null : (
                            <span className="text-xs text-muted-foreground">No change detected.</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-border/60 bg-background p-4">
                  <h3 className="text-sm font-semibold text-foreground">Decision</h3>
                  <Textarea
                    placeholder="Share approval notes or requested changes for the partner."
                    value={decisionNotes}
                    onChange={(event) => setDecisionNotes(event.target.value)}
                    className="min-h-[120px]"
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" onClick={handleApprove} disabled={decisionInFlight}>
                      {approveVersion.isLoading ? 'Approving…' : 'Approve version'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReject}
                      disabled={decisionInFlight}
                    >
                      {rejectVersion.isLoading ? 'Sending…' : 'Request changes'}
                    </Button>
                  </div>
                </div>
              </section>
            ) : null}
          </main>
        </div>
      )}
    </div>
  );
}
