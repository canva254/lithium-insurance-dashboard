'use client';

import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { usePolicies, useUpdatePolicy, useDeletePolicy, type PolicyFilters } from '@/hooks/usePolicies';
import type { PolicyRecord, PolicyUpdatePayload } from '@/types/api';

const STATUS_OPTIONS = ['all', 'active', 'pending', 'expired', 'cancelled', 'suspended'] as const;

type PolicyFormState = {
  holderName: string;
  details: string;
  expiryDate: string;
  premium: string;
  status: string;
};

const formatCurrency = (value?: number | null) => {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value);
};

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-500';
    case 'pending':
      return 'bg-blue-500/10 text-blue-500';
    case 'expired':
      return 'bg-amber-500/10 text-amber-500';
    case 'cancelled':
      return 'bg-rose-500/10 text-rose-500';
    case 'suspended':
      return 'bg-slate-500/10 text-slate-500';
    default:
      return 'bg-slate-500/10 text-slate-500';
  }
};

export default function PoliciesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filters = useMemo<PolicyFilters>(() => {
    const query: PolicyFilters = { page, pageSize: 25 };
    if (search.trim()) query.q = search.trim();
    if (statusFilter !== 'all') query.status = statusFilter;
    if (productFilter !== 'all') query.product = productFilter;
    return query;
  }, [search, statusFilter, productFilter, page]);

  const { data, isLoading, isError } = usePolicies(filters);
  const total = data?.meta.total ?? 0;
  const pageSize = data?.meta.pageSize ?? 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const productOptions = useMemo(() => {
    const items = data?.items ?? [];
    const values = new Set<string>();
    items.forEach((item) => {
      if (item.product) values.add(item.product);
    });
    return Array.from(values).sort();
  }, [data]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const openModal = (policy: PolicyRecord) => {
    setSelectedPolicy(policy);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedPolicy(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Policies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track issued policies, update status, and resolve customer requests.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
          {total.toLocaleString()} policy{total === 1 ? '' : ' entries'}
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by holder, policy number, or notes"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 md:col-span-2"
          />
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number]);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All statuses' : option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={productFilter}
            onChange={(event) => {
              setProductFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All products</option>
            {productOptions.map((product) => (
              <option key={product} value={product}>
                {product.charAt(0).toUpperCase() + product.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setProductFilter('all');
              setPage(1);
            }}
            className="font-medium underline"
          >
            Reset filters
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
        </div>
      </section>

      {isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-destructive-foreground">
          Unable to load policies. Please refresh.
        </div>
      ) : isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border/70 text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Policy number</th>
                <th className="px-4 py-3">Holder</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Premium</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data?.items.map((policy) => (
                <tr key={policy.id} className="bg-background/80">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{policy.policyNumber}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{policy.holderName}</td>
                  <td className="px-4 py-3 text-sm capitalize text-muted-foreground">{policy.product || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatCurrency(policy.premium)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(policy.status)}`}>
                      {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {policy.expiryDate ? new Date(policy.expiryDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {policy.createdAt ? new Date(policy.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    <button
                      onClick={() => openModal(policy)}
                      className="rounded-md border border-border/60 px-3 py-1 font-medium text-muted-foreground hover:bg-muted"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!data?.items.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-6">
                    <EmptyState
                      title="No policies found"
                      description="Adjust your filters or try a different search term to locate policy records."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              <button
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
                className="rounded-md border border-border/60 px-3 py-1 font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Previous
              </button>
              <span>
                Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total.toLocaleString()}
              </span>
              <button
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-border/60 px-3 py-1 font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {modalOpen && selectedPolicy && (
        <PolicyDetailModal policy={selectedPolicy} onClose={closeModal} />
      )}
    </div>
  );
}

function PolicyDetailModal({ policy, onClose }: { policy: PolicyRecord; onClose: () => void }) {
  const updatePolicy = useUpdatePolicy();
  const deletePolicy = useDeletePolicy();
  const [formState, setFormState] = useState<PolicyFormState>({
    holderName: policy.holderName,
    details: policy.details ?? '',
    expiryDate: policy.expiryDate ?? '',
    premium: policy.premium != null ? String(policy.premium) : '',
    status: policy.status,
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormState({
      holderName: policy.holderName,
      details: policy.details ?? '',
      expiryDate: policy.expiryDate ?? '',
      premium: policy.premium != null ? String(policy.premium) : '',
      status: policy.status,
    });
    setError(null);
    setSuccessMessage(null);
  }, [policy]);

  const handleChange = (field: keyof PolicyFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedName = formState.holderName.trim();
    if (!trimmedName) {
      setError('Policy holder name is required.');
      return;
    }

    const payload: PolicyUpdatePayload = {
      holderName: trimmedName,
      details: formState.details.trim() || undefined,
      expiryDate: formState.expiryDate || undefined,
      premium: formState.premium ? Number(formState.premium) : undefined,
      status: formState.status,
    };

    if (payload.premium != null && (Number.isNaN(payload.premium) || payload.premium < 0)) {
      setError('Enter a valid premium value.');
      return;
    }

    try {
      await updatePolicy.mutateAsync({ policyId: policy.id, payload });
      setSuccessMessage('Policy updated successfully.');
    } catch (mutationError: any) {
      setError(mutationError?.message ?? 'Failed to update policy.');
    }
  };

  const handleDelete = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      await deletePolicy.mutateAsync(policy.id);
      onClose();
    } catch (mutationError: any) {
      setError(mutationError?.message ?? 'Failed to delete policy.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Policy details</h2>
            <p className="text-xs text-muted-foreground">Policy number {policy.policyNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            disabled={updatePolicy.isLoading || deletePolicy.isLoading}
          >
            Close
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground">
              {successMessage}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Policy holder</label>
              <input
                value={formState.holderName}
                onChange={(event) => handleChange('holderName', event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</label>
              <select
                value={formState.status}
                onChange={(event) => handleChange('status', event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {STATUS_OPTIONS.filter((option) => option !== 'all').map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Premium (KES)</label>
              <input
                value={formState.premium}
                onChange={(event) => handleChange('premium', event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="15000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expiry date</label>
              <input
                type="date"
                value={formState.expiryDate}
                onChange={(event) => handleChange('expiryDate', event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</label>
            <textarea
              value={formState.details}
              onChange={(event) => handleChange('details', event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Additional notes or coverage details"
            />
          </div>

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deletePolicy.isLoading}
              className="rounded-md border border-destructive/60 px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete policy
            </button>
            <button
              type="submit"
              disabled={updatePolicy.isLoading}
              className="rounded-md border border-primary/60 bg-primary/90 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
