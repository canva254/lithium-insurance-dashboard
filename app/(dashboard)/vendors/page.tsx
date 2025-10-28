'use client';

import { useMemo, useState } from 'react';

import {
  useCreateVendor,
  useDeleteVendor,
  useUpdateVendor,
  useVendors,
} from '@/hooks/useVendors';
import { EmptyState } from '@/components/empty-state';
import { useRole } from '@/hooks/useRole';
import { ACTION_PERMISSIONS, isRoleAllowed } from '@/lib/permissions';
import type { Vendor } from '@/types/api';

type VendorFormState = {
  name: string;
  description: string;
  logoUrl: string;
  website: string;
  contactEmail: string;
  phone: string;
  isActive: boolean;
};

export default function VendorsPage() {
  const { data: vendors = [], isLoading, isError, refetch } = useVendors();
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();
  const { role } = useRole();
  const canManage = isRoleAllowed(role, ACTION_PERMISSIONS.manageVendors);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formState, setFormState] = useState<VendorFormState>({
    name: '',
    description: '',
    logoUrl: '',
    website: '',
    contactEmail: '',
    phone: '',
    isActive: true,
  });

  const stats = useMemo(() => {
    const total = vendors.length;
    const active = vendors.filter((vendor) => vendor.isActive).length;
    return {
      total,
      active,
      inactive: total - active,
    };
  }, [vendors]);

  const handleToggle = async (vendorId: string, isActive: boolean) => {
    if (!canManage) return;
    setError(null);
    try {
      await updateVendor.mutateAsync({ id: vendorId, data: { isActive } });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update vendor.');
    }
  };

  const handleDelete = async (vendorId: string) => {
    if (!canManage) return;
    setError(null);
    try {
      await deleteVendor.mutateAsync(vendorId);
      await refetch();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete vendor.');
    }
  };

  const openCreateForm = () => {
    if (!canManage) return;
    setEditingVendor(null);
    setFormState({
      name: '',
      description: '',
      logoUrl: '',
      website: '',
      contactEmail: '',
      phone: '',
      isActive: true,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (vendor: Vendor) => {
    if (!canManage) return;
    setEditingVendor(vendor);
    setFormState({
      name: vendor.name,
      description: vendor.description ?? '',
      logoUrl: vendor.logoUrl ?? '',
      website: vendor.website ?? '',
      contactEmail: vendor.contactEmail ?? '',
      phone: vendor.phone ?? '',
      isActive: vendor.isActive,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (formSubmitting) return;
    setIsFormOpen(false);
    setEditingVendor(null);
    setFormError(null);
  };

  const handleFieldChange = (field: keyof VendorFormState, value: string | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    } as VendorFormState));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      if (!canManage) {
        throw new Error('You do not have permission to manage vendors.');
      }

      const payload = {
        name: formState.name.trim(),
        description: formState.description.trim() || undefined,
        logoUrl: formState.logoUrl.trim() || undefined,
        website: formState.website.trim() || undefined,
        contactEmail: formState.contactEmail.trim() || undefined,
        phone: formState.phone.trim() || undefined,
        isActive: formState.isActive,
      };

      if (!payload.name) {
        throw new Error('Vendor name is required.');
      }

      if (editingVendor) {
        await updateVendor.mutateAsync({ id: editingVendor.id, data: payload });
      } else {
        await createVendor.mutateAsync(payload);
      }

      closeForm();
    } catch (err: any) {
      setFormError(err?.message ?? 'Unable to save vendor.');
    } finally {
      setFormSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-destructive-foreground">
        Unable to load vendors at this time.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage carrier partners powering the insurance marketplace.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <button
            onClick={openCreateForm}
            disabled={!canManage}
            className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            New vendor
          </button>
          {!canManage && <span className="text-xs text-muted-foreground">You have read-only access.</span>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total" value={stats.total} description="registered vendors" />
        <StatCard label="Active" value={stats.active} description="available for policy quoting" />
        <StatCard label="Inactive" value={stats.inactive} description="disabled vendors" />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="min-w-full divide-y divide-border/80 text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {vendors.map((vendor) => (
              <tr key={vendor.id} className="bg-background/80">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{vendor.name}</p>
                  <p className="text-xs text-muted-foreground">{vendor.website ?? 'No website provided'}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-foreground">{vendor.contactEmail ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{vendor.phone ?? 'No phone on file'}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      vendor.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    {vendor.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs">
                  {canManage ? (
                    <>
                      <button
                        onClick={() => openEditForm(vendor)}
                        className="rounded-md border border-border/60 px-3 py-1 font-medium text-muted-foreground transition hover:bg-muted"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(vendor.id, !vendor.isActive)}
                        disabled={updateVendor.isLoading}
                        className="ml-2 rounded-md border border-border/60 px-3 py-1 font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-60"
                      >
                        {vendor.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(vendor.id)}
                        disabled={deleteVendor.isLoading}
                        className="ml-2 rounded-md border border-destructive/50 px-3 py-1 font-medium text-destructive-foreground transition hover:bg-destructive/10 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No actions</span>
                  )}
                </td>
              </tr>
            ))}
            {!vendors.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6">
                  <EmptyState
                    title="No vendors registered"
                    description="Connect with partners to publish their insurance products."
                    action={
                      canManage ? (
                        <button
                          onClick={openCreateForm}
                          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                        >
                          Add vendor
                        </button>
                      ) : null
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen ? (
        <VendorForm
          mode={editingVendor ? 'edit' : 'create'}
          values={formState}
          isSubmitting={formSubmitting}
          error={formError}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      ) : null}
    </div>
  );
}

function VendorForm({
  mode,
  values,
  onFieldChange,
  onSubmit,
  onClose,
  isSubmitting,
  error,
}: {
  mode: 'create' | 'edit';
  values: VendorFormState;
  onFieldChange: (field: keyof VendorFormState, value: string | boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {mode === 'edit' ? 'Edit vendor' : 'Create vendor'}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</label>
              <input
                value={values.name}
                onChange={(event) => onFieldChange('name', event.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Website</label>
              <input
                value={values.website}
                onChange={(event) => onFieldChange('website', event.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact email</label>
              <input
                type="email"
                value={values.contactEmail}
                onChange={(event) => onFieldChange('contactEmail', event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</label>
              <input
                value={values.phone}
                onChange={(event) => onFieldChange('phone', event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Logo URL</label>
            <input
              value={values.logoUrl}
              onChange={(event) => onFieldChange('logoUrl', event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</label>
            <textarea
              value={values.description}
              onChange={(event) => onFieldChange('description', event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => onFieldChange('isActive', event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Active vendor
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
              {isSubmitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ label, value, description }: { label: string; value: number; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
