'use client';

import { useMemo, useState } from 'react';

import {
  useCreateDiscount,
  useDeleteDiscount,
  usePricingDiscounts,
  usePricingRates,
  useUpdateDiscount,
  useUpdateRates,
} from '@/hooks/usePricing';
import type { Discount } from '@/types/api';
import { useRole } from '@/hooks/useRole';
import { ACTION_PERMISSIONS, isRoleAllowed } from '@/lib/permissions';

type DiscountFormState = {
  code: string;
  type: 'percentage' | 'fixed';
  value: string;
  validUntil: string;
  minPurchase: string;
  isActive: boolean;
};

export default function PricingPage() {
  const {
    data: rates,
    isLoading: ratesLoading,
    isError: ratesError,
    refetch: refetchRates,
  } = usePricingRates();
  const {
    data: discounts = [],
    isLoading: discountsLoading,
    isError: discountsError,
    refetch: refetchDiscounts,
  } = usePricingDiscounts();
  const createDiscount = useCreateDiscount();
  const updateDiscount = useUpdateDiscount();
  const updateRates = useUpdateRates();
  const deleteDiscount = useDeleteDiscount();
  const { role } = useRole();
  const canManage = isRoleAllowed(role, ACTION_PERMISSIONS.managePricing);
  const [error, setError] = useState<string | null>(null);
  const [discountFormError, setDiscountFormError] = useState<string | null>(null);
  const [discountFormSubmitting, setDiscountFormSubmitting] = useState(false);
  const [isDiscountFormOpen, setIsDiscountFormOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [discountFormState, setDiscountFormState] = useState<DiscountFormState>({
    code: '',
    type: 'percentage',
    value: '',
    validUntil: '',
    minPurchase: '',
    isActive: true,
  });

  const baseRates = useMemo(() => {
    if (!rates?.baseRates) return [] as Array<[string, number]>;
    return Object.entries(rates.baseRates);
  }, [rates?.baseRates]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(value);

  const handleRefresh = async () => {
    setError(null);
    await Promise.all([refetchRates(), refetchDiscounts()]);
  };

  const handleRateBump = async (percentage: number) => {
    if (!rates?.baseRates || !canManage) return;
    setError(null);
    const multiplier = 1 + percentage;
    const updated = Object.fromEntries(
      Object.entries(rates.baseRates).map(([key, value]) => [key, Math.round(value * multiplier)]),
    );

    try {
      await updateRates.mutateAsync({ baseRates: updated });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update base rates.');
    }
  };

  const handleDeleteDiscount = async (discountId: string) => {
    if (!canManage) return;
    setError(null);
    try {
      await deleteDiscount.mutateAsync(discountId);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete discount.');
    }
  };

  const openCreateDiscountForm = () => {
    if (!canManage) return;
    setEditingDiscount(null);
    setDiscountFormState({
      code: '',
      type: 'percentage',
      value: '',
      validUntil: '',
      minPurchase: '',
      isActive: true,
    });
    setDiscountFormError(null);
    setIsDiscountFormOpen(true);
  };

  const openEditDiscountForm = (discount: Discount) => {
    if (!canManage) return;
    setEditingDiscount(discount);
    setDiscountFormState({
      code: discount.code,
      type: discount.type,
      value: String(discount.value ?? ''),
      validUntil: discount.validUntil ? discount.validUntil.slice(0, 10) : '',
      minPurchase: discount.minPurchase != null ? String(discount.minPurchase) : '',
      isActive: discount.isActive ?? true,
    });
    setDiscountFormError(null);
    setIsDiscountFormOpen(true);
  };

  const closeDiscountForm = () => {
    if (discountFormSubmitting) return;
    setIsDiscountFormOpen(false);
    setEditingDiscount(null);
    setDiscountFormError(null);
  };

  const handleDiscountFieldChange = (field: keyof DiscountFormState, value: string | boolean) => {
    setDiscountFormState((prev) => ({
      ...prev,
      [field]: value,
    } as DiscountFormState));
  };

  const handleDiscountSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDiscountFormError(null);
    setDiscountFormSubmitting(true);

    try {
      if (!canManage) {
        throw new Error('You do not have permission to manage pricing.');
      }

      const valueNumber = Number(discountFormState.value);
      if (Number.isNaN(valueNumber) || valueNumber < 0) {
        throw new Error('Enter a valid discount value.');
      }

      const payload = {
        code: discountFormState.code.trim(),
        type: discountFormState.type,
        value: valueNumber,
        validUntil: discountFormState.validUntil || undefined,
        minPurchase:
          discountFormState.minPurchase.trim() !== ''
            ? Number(discountFormState.minPurchase)
            : undefined,
        isActive: discountFormState.isActive,
      };

      if (!payload.code) {
        throw new Error('Discount code is required.');
      }

      if (editingDiscount?.id) {
        await updateDiscount.mutateAsync({ id: editingDiscount.id, data: payload });
      } else {
        await createDiscount.mutateAsync(payload);
      }

      closeDiscountForm();
    } catch (err: any) {
      setDiscountFormError(err?.message ?? 'Unable to save discount.');
    } finally {
      setDiscountFormSubmitting(false);
    }
  };

  if (ratesLoading || discountsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (ratesError || discountsError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-destructive-foreground">
        Unable to load pricing data. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pricing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor actuarial base rates and promotional discounts offered across carriers.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right text-sm">
          <button
            onClick={() => handleRateBump(0.05)}
            disabled={!canManage || updateRates.isLoading}
            className="rounded-md border border-border/60 px-3 py-2 font-medium text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Apply 5% uplift
          </button>
          <button
            onClick={handleRefresh}
            className="rounded-md border border-border/60 px-3 py-2 font-medium text-muted-foreground transition hover:bg-muted"
          >
            Refresh data
          </button>
          <button
            onClick={openCreateDiscountForm}
            disabled={!canManage}
            className="rounded-md border border-border/60 px-3 py-2 font-medium text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            New discount
          </button>
          {!canManage && <span className="text-xs text-muted-foreground">You have read-only access.</span>}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Base rates</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          These rates feed the quoting engine. Adjust with caution.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {baseRates.map(([category, value]) => (
            <div key={category} className="rounded-lg border border-border/60 bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{category}</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(value)}</p>
            </div>
          ))}
          {!baseRates.length && (
            <p className="col-span-full text-sm text-muted-foreground">No base rates configured.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Active discounts</h2>
            <p className="mt-1 text-xs text-muted-foreground">Manage promotional campaigns and expiry windows.</p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
          <table className="min-w-full divide-y divide-border/80 text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Valid until</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {discounts.map((discount) => (
                <tr key={discount.id ?? discount.code} className="bg-background/80">
                  <td className="px-4 py-3 font-medium text-foreground">{discount.code}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{discount.type}</td>
                  <td className="px-4 py-3 text-foreground">
                    {discount.type === 'percentage'
                      ? `${discount.value}%`
                      : formatCurrency(discount.value)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {discount.validUntil ? new Date(discount.validUntil).toLocaleDateString() : 'No expiry'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        discount.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {discount.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {canManage ? (
                      <>
                        <button
                          onClick={() => openEditDiscountForm(discount)}
                          className="rounded-md border border-border/60 px-3 py-1 font-medium text-muted-foreground transition hover:bg-muted"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDiscount(discount.id ?? discount.code)}
                          disabled={deleteDiscount.isLoading}
                          className="ml-2 rounded-md border border-destructive/50 px-3 py-1 font-medium text-destructive-foreground transition hover:bg-destructive/10 disabled:opacity-60"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <span className="text-muted-foreground">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            {!discounts.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No discounts configured.
                </td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      </section>

      {isDiscountFormOpen ? (
        <DiscountForm
          mode={editingDiscount ? 'edit' : 'create'}
          values={discountFormState}
          isSubmitting={discountFormSubmitting}
          error={discountFormError}
          onFieldChange={handleDiscountFieldChange}
          onSubmit={handleDiscountSubmit}
          onClose={closeDiscountForm}
        />
      ) : null}
    </div>
  );
}

function DiscountForm({
  mode,
  values,
  onFieldChange,
  onSubmit,
  onClose,
  isSubmitting,
  error,
}: {
  mode: 'create' | 'edit';
  values: DiscountFormState;
  onFieldChange: (field: keyof DiscountFormState, value: string | boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-xl rounded-xl border border-border bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {mode === 'edit' ? 'Edit discount' : 'Create discount'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            disabled={isSubmitting}
          >
            Close
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Code</label>
            <input
              value={values.code}
              onChange={(event) => onFieldChange('code', event.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</label>
              <select
                value={values.type}
                onChange={(event) => onFieldChange('type', event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Value</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={values.value}
                onChange={(event) => onFieldChange('value', event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valid until</label>
              <input
                type="date"
                value={values.validUntil}
                onChange={(event) => onFieldChange('validUntil', event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Minimum purchase</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={values.minPurchase}
                onChange={(event) => onFieldChange('minPurchase', event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => onFieldChange('isActive', event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Active discount
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create discount'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
