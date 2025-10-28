'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  usePartnerPackage,
  usePartnerPackageVersions,
  usePartnerPackageDocuments,
  useUploadPartnerPackageDocument,
  useSubmitPartnerPackageVersion,
} from '@/hooks/usePartnerPackages';

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
};

const formatCurrency = (value?: number) => {
  if (typeof value !== 'number') return '—';
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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

type PackageDetailClientProps = {
  packageId: string;
};

export default function PackageDetailClient({ packageId }: PackageDetailClientProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [baselineVersionId, setBaselineVersionId] = useState<string | null>(null);
  const [targetVersionId, setTargetVersionId] = useState<string | null>(null);

  const {
    data: packageData,
    isLoading,
    isError,
    error,
  } = usePartnerPackage(packageId);
  const { data: versions = [], isLoading: versionsLoading } = usePartnerPackageVersions(packageId);
  const {
    data: documents = [],
    isLoading: documentsLoading,
  } = usePartnerPackageDocuments(packageId);

  const uploadDocument = useUploadPartnerPackageDocument();
  const submitVersion = useSubmitPartnerPackageVersion();

  const latestDraft = useMemo(
    () => versions.find((version) => version.status === 'draft'),
    [versions],
  );

  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  }, [versions]);

  useEffect(() => {
    if (sortedVersions.length >= 2) {
      setBaselineVersionId(sortedVersions[0].id);
      setTargetVersionId(sortedVersions[1].id);
    } else if (sortedVersions.length === 1) {
      setBaselineVersionId(sortedVersions[0].id);
      setTargetVersionId(null);
    } else {
      setBaselineVersionId(null);
      setTargetVersionId(null);
    }
  }, [sortedVersions]);

  const baselineVersion = useMemo(
    () => sortedVersions.find((version) => version.id === baselineVersionId) ?? null,
    [sortedVersions, baselineVersionId],
  );

  const targetVersion = useMemo(
    () => sortedVersions.find((version) => version.id === targetVersionId) ?? null,
    [sortedVersions, targetVersionId],
  );

  const versionComparison = useMemo(() => {
    if (!baselineVersion || !targetVersion) return null;

    const baselineFeatures = new Set(baselineVersion.features ?? []);
    const targetFeatures = new Set(targetVersion.features ?? []);

    const addedFeatures = [...targetFeatures].filter((feature) => !baselineFeatures.has(feature));
    const removedFeatures = [...baselineFeatures].filter((feature) => !targetFeatures.has(feature));

    return {
      name: {
        previous: baselineVersion.name ?? '—',
        current: targetVersion.name ?? '—',
      },
      description: {
        previous: baselineVersion.description ?? '—',
        current: targetVersion.description ?? '—',
      },
      basePrice: {
        previous: baselineVersion.basePrice ?? null,
        current: targetVersion.basePrice ?? null,
      },
      features: {
        added: addedFeatures,
        removed: removedFeatures,
      },
      tags: {
        added: (targetVersion.tags ?? []).filter((tag) => !(baselineVersion.tags ?? []).includes(tag)),
        removed: (baselineVersion.tags ?? []).filter((tag) => !(targetVersion.tags ?? []).includes(tag)),
      },
      visibility: {
        previous: baselineVersion.partnerVisibility ?? 'pending',
        current: targetVersion.partnerVisibility ?? 'pending',
      },
    };
  }, [baselineVersion, targetVersion]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadDocument.mutateAsync({ packageId, file });
      toast({ title: 'Document uploaded', description: `${file.name} is now attached to this package.` });
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err?.message || 'Could not upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmitForReview = async () => {
    if (!latestDraft) return;
    try {
      await submitVersion.mutateAsync({ packageId, versionId: latestDraft.id });
      toast({
        title: 'Submitted for review',
        description: 'Admins have been notified. Track progress in the timeline below.',
      });
    } catch (err: any) {
      toast({
        title: 'Submission failed',
        description: err?.message || 'Unable to submit draft. Resolve any outstanding issues and try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !packageData) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {(error as { message?: string } | null)?.message ?? 'Unable to load package details.'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">{packageData.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{packageData.description || 'No description provided.'}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Badge variant={workflowVariant(packageData.workflowState)} className="capitalize">
                {workflowLabel(packageData.workflowState)}
              </Badge>
              <Badge variant={packageData.partnerVisibility === 'visible' ? 'default' : 'outline'} className="capitalize">
                {packageData.partnerVisibility ?? 'pending'} visibility
              </Badge>
              <Badge variant="outline" className="capitalize">
                {packageData.category ?? 'uncategorised'}
              </Badge>
            </div>
          </div>
          {latestDraft && (
            <Button
              onClick={handleSubmitForReview}
              disabled={submitVersion.isLoading}
              className="ml-auto"
            >
              {submitVersion.isLoading ? 'Submitting…' : 'Submit latest draft'}
            </Button>
          )}
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Base price</dt>
            <dd className="font-medium text-foreground">{formatCurrency(packageData.basePrice)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Latest version</dt>
            <dd className="font-medium text-foreground">{packageData.latestVersion ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last updated</dt>
            <dd className="font-medium text-foreground">{formatDate(packageData.updatedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tenant</dt>
            <dd className="font-medium text-foreground">{packageData.tenantId ?? 'Default'}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground">Features</h3>
          {packageData.features?.length ? (
            <ul className="mt-2 list-disc pl-5 text-sm text-foreground">
              {packageData.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No features recorded.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Version history</h3>
          {versionsLoading && <span className="text-xs text-muted-foreground">Refreshing…</span>}
        </div>
        {sortedVersions.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No versions tracked yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {sortedVersions.map((version) => (
              <li key={version.id} className="rounded-md border border-border/60 bg-background px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">Version {version.version ?? '—'}</span>
                    <Badge variant={workflowVariant(version.status)} className="capitalize">
                      {workflowLabel(version.status)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Updated {formatDate(version.createdAt)}</span>
                </div>
                {version.changeSummary && (
                  <p className="mt-2 text-sm text-muted-foreground">{version.changeSummary}</p>
                )}
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <div>
                    <span className="font-medium text-foreground">Submitted</span>
                    <div>{formatDate(version.submittedAt)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Approved</span>
                    <div>{formatDate(version.approvedAt)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Visibility</span>
                    <div className="capitalize">{version.partnerVisibility ?? 'pending'}</div>
                  </div>
                </div>
                {version.rejectedReason && (
                  <div className="mt-3 rounded border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    Changes requested: {version.rejectedReason}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {sortedVersions.length >= 2 && (
        <section className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Compare versions</h3>
              <p className="text-sm text-muted-foreground">Select two versions to see what changed.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Baseline version
              </label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={baselineVersionId ?? ''}
                onChange={(event) => setBaselineVersionId(event.target.value || null)}
              >
                {sortedVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    Version {version.version ?? '—'}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Comparison version
              </label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={targetVersionId ?? ''}
                onChange={(event) => setTargetVersionId(event.target.value || null)}
              >
                <option value="">Select version</option>
                {sortedVersions
                  .filter((version) => version.id !== baselineVersionId)
                  .map((version) => (
                    <option key={version.id} value={version.id}>
                      Version {version.version ?? '—'}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          {versionComparison ? (
            <div className="mt-6 space-y-4">
              <ComparisonRow
                label="Name"
                previous={versionComparison.name.previous}
                current={versionComparison.name.current}
              />
              <ComparisonRow
                label="Description"
                previous={versionComparison.description.previous}
                current={versionComparison.description.current}
              />
              <ComparisonRow
                label="Base price"
                previous={versionComparison.basePrice.previous ?? '—'}
                current={versionComparison.basePrice.current ?? '—'}
                formatter={(value) => {
                  const numeric = typeof value === 'number' ? value : Number(value);
                  return formatCurrency(Number.isFinite(numeric) ? numeric : undefined);
                }}
              />
              <FeatureComparison
                added={versionComparison.features.added}
                removed={versionComparison.features.removed}
              />
              <TagComparison added={versionComparison.tags.added} removed={versionComparison.tags.removed} />
              <ComparisonRow
                label="Partner visibility"
                previous={versionComparison.visibility.previous}
                current={versionComparison.visibility.current}
                formatter={(value) => {
                  if (value == null || value === '') {
                    return '--';
                  }
                  const text = typeof value === 'number' ? String(value) : value;
                  if (text === '—' || text === '--') {
                    return text;
                  }
                  return text.charAt(0).toUpperCase() + text.slice(1);
                }}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Choose a comparison version to view differences.</p>
          )}
        </section>
      )}

      <section className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Documents</h3>
            <p className="text-sm text-muted-foreground">Supporting files shared with the review team.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadDocument.isLoading}
            >
              {uploadDocument.isLoading ? 'Uploading…' : 'Upload document'}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Accepted formats: PDF, Word, Excel, PNG, JPG. Maximum size 25 MB.
        </p>
        {documentsLoading ? (
          <div className="mt-4 text-sm text-muted-foreground">Loading documents…</div>
        ) : documents.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No documents uploaded yet.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{document.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {formatDate(document.uploadedAt)} · {formatFileSize(document.fileSize)}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {document.uploadedBy ? `By ${document.uploadedBy}` : null}
                  {document.downloadUrl ? (
                    <Link
                      href={document.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary underline"
                    >
                      View
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type ComparisonRowProps = {
  label: string;
  previous: string | number;
  current: string | number;
  formatter?: (value: string | number) => string;
};

function ComparisonRow({ label, previous, current, formatter }: ComparisonRowProps) {
  const formatValue = (value: string | number) => {
    if (formatter) {
      return formatter(value);
    }
    return typeof value === 'number' ? String(value) : value;
  };

  return (
    <div className="rounded-md border border-border/60 bg-background p-3 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">Previous</div>
          <div className="font-medium text-foreground">{formatValue(previous)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Current</div>
          <div className="font-medium text-foreground">{formatValue(current)}</div>
        </div>
      </div>
    </div>
  );
}

function FeatureComparison({ added, removed }: { added: string[]; removed: string[] }) {
  if (added.length === 0 && removed.length === 0) {
    return (
      <div className="rounded-md border border-border/60 bg-background p-3 text-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Features</div>
        <p className="mt-2 text-sm text-muted-foreground">No feature changes detected.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/60 bg-background p-3 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Features</div>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">Added</div>
          {added.length ? (
            <ul className="mt-1 list-disc pl-4 text-sm text-emerald-600">
              {added.map((feature) => (
                <li key={`added-${feature}`}>{feature}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">None</p>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Removed</div>
          {removed.length ? (
            <ul className="mt-1 list-disc pl-4 text-sm text-destructive">
              {removed.map((feature) => (
                <li key={`removed-${feature}`}>{feature}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">None</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TagComparison({ added, removed }: { added: string[]; removed: string[] }) {
  if (added.length === 0 && removed.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-border/60 bg-background p-3 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</div>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">Added</div>
          {added.length ? (
            <div className="mt-1 flex flex-wrap gap-2">
              {added.map((tag) => (
                <Badge key={`tag-added-${tag}`} variant="outline" className="border-emerald-500 text-emerald-600">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">None</p>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Removed</div>
          {removed.length ? (
            <div className="mt-1 flex flex-wrap gap-2">
              {removed.map((tag) => (
                <Badge key={`tag-removed-${tag}`} variant="outline" className="border-destructive text-destructive">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">None</p>
          )}
        </div>
      </div>
    </div>
  );
}
