'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { packagesAPI } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import {
  useCreatePackage,
  useCreatePackageVersion,
  useDeletePackage,
  useDeletePackageDocument,
  useBulkPackageAction,
  usePackages,
  usePackage,
  usePackageDocuments,
  useApprovePackageVersion,
  useRejectPackageVersion,
  useSubmitPackageVersion,
  useUpdatePackage,
  useUploadPackageDocument,
} from '@/hooks/usePackages';
import { useVendors } from '@/hooks/useVendors';
import { ACTION_PERMISSIONS, isRoleAllowed } from '@/lib/permissions';
import type {
  CreatePackageRequest,
  InsurancePackage,
  PackageVersionDraftRequest,
  PolicyDocument,
  PolicyVersion,
  Vendor,
} from '@/types/api';

const CATEGORY_OPTIONS: InsurancePackage['category'][] = ['motor', 'health', 'travel', 'home', 'business'];
const STATUS_OPTIONS = ['all', 'active', 'inactive'] as const;
const WORKFLOW_OPTIONS = ['all', 'draft', 'pending_review', 'approved', 'changes_requested'] as const;
const SORT_OPTIONS = [
  { label: 'Newest', value: 'created_at' },
  { label: 'Name', value: 'name' },
  { label: 'Base price', value: 'base_price' },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number];
type SortKey = (typeof SORT_OPTIONS)[number]['value'];

type PackageFormState = {
  name: string;
  description: string;
  category: InsurancePackage['category'];
  basePrice: string;
  features: string;
  vendorId: string;
  isActive: boolean;
  tags: string;
  changeSummary: string;
};

type PackageFilters = {
  search?: string;
  status?: 'active' | 'inactive';
  category?: InsurancePackage['category'];
  workflowState?: 'draft' | 'pending_review' | 'approved' | 'changes_requested';
  sortBy: SortKey;
  sortOrder: 'asc' | 'desc';
};

type BulkActionType = 'activate' | 'deactivate' | 'assign_tags' | 'add_tags' | 'remove_tags';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value);

const formatFileSize = (value?: number) => {
  if (value == null) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const formatWorkflowState = (state: InsurancePackage['workflowState']) =>
  state
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const workflowBadgeClass = (state: InsurancePackage['workflowState']) => {
  switch (state) {
    case 'approved':
      return 'bg-emerald-500/10 text-emerald-500';
    case 'pending_review':
      return 'bg-blue-500/10 text-blue-500';
    case 'changes_requested':
      return 'bg-amber-500/10 text-amber-500';
    default:
      return 'bg-slate-500/10 text-slate-500';
  }
};

export default function PackagesPage() {
  const { role } = useRole();
  const canManage = isRoleAllowed(role, ACTION_PERMISSIONS.managePackages);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | InsurancePackage['category']>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [workflowFilter, setWorkflowFilter] = useState<(typeof WORKFLOW_OPTIONS)[number]>('all');
  const [sortBy, setSortBy] = useState<SortKey>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [formState, setFormState] = useState<PackageFormState>({
    name: '',
    description: '',
    category: 'motor',
    basePrice: '',
    features: '',
    vendorId: '',
    isActive: true,
    tags: '',
    changeSummary: '',
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingPackage, setEditingPackage] = useState<InsurancePackage | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<InsurancePackage | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionType, setBulkActionType] = useState<BulkActionType>('activate');
  const [bulkTags, setBulkTags] = useState('');

  const filters = useMemo<PackageFilters>(() => {
    const base: PackageFilters = { sortBy, sortOrder };
    if (searchTerm.trim()) base.search = searchTerm.trim();
    if (categoryFilter !== 'all') base.category = categoryFilter;
    if (statusFilter !== 'all') base.status = statusFilter;
    if (workflowFilter !== 'all') base.workflowState = workflowFilter;
    return base;
  }, [searchTerm, categoryFilter, statusFilter, workflowFilter, sortBy, sortOrder]);

  const { data: packages = [], isLoading, isError } = usePackages(filters);
  const { data: vendors = [] } = useVendors();
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const removePackage = useDeletePackage();
  const createVersion = useCreatePackageVersion();
  const submitVersion = useSubmitPackageVersion();
  const approveVersion = useApprovePackageVersion();
  const rejectVersion = useRejectPackageVersion();
  const bulkMutation = useBulkPackageAction();
  const uploadDocument = useUploadPackageDocument();
  const deleteDocument = useDeletePackageDocument();
  const { data: documents = [], isLoading: documentsLoading } = usePackageDocuments(selectedPackage?.id ?? '');
  const { data: selectedDetail } = usePackage(selectedPackage?.id ?? '');

  type FormPayloadResult =
    | { error: string; payload?: undefined }
    | { error?: undefined; payload: CreatePackageRequest & { tags?: string[] } };

  const parseTags = (value: string) =>
    value
      .split(/\r?\n|,/)
      .map((line) => line.trim())
      .filter(Boolean);

  const buildFormPayload = (): FormPayloadResult => {
    const name = formState.name.trim();
    if (!name) {
      return { error: 'Package name is required.' };
    }

    const basePriceNumber = Number(formState.basePrice);
    if (Number.isNaN(basePriceNumber) || basePriceNumber < 0) {
      return { error: 'Enter a valid base price.' };
    }

    const features = formState.features
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const tags = parseTags(formState.tags);

    const description = formState.description.trim();

    const payload: CreatePackageRequest & { tags?: string[] } = {
      name,
      description,
      category: formState.category,
      basePrice: basePriceNumber,
      features,
      vendorId: formState.vendorId || undefined,
      isActive: formState.isActive,
      tags,
    };

    return { payload };
  };

  const stats = useMemo(() => {
    const total = packages.length;
    const active = packages.filter((pkg) => pkg.isActive).length;
    return { total, active, inactive: total - active };
  }, [packages]);

  useEffect(() => {
    if (selectedDetail && isDetailOpen) {
      setSelectedPackage(selectedDetail);
    }
  }, [selectedDetail, isDetailOpen]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => packages.some((pkg) => pkg.id === id)));
  }, [packages]);

  useEffect(() => {
    if (!canManage) {
      setSelectedIds([]);
    }
  }, [canManage]);

  const openCreateModal = () => {
    if (!canManage) return;
    setEditingPackage(null);
    setFormState({
      name: '',
      description: '',
      category: 'motor',
      basePrice: '',
      features: '',
      vendorId: '',
      isActive: true,
      tags: '',
      changeSummary: '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (pkg: InsurancePackage) => {
    if (!canManage) return;
    setEditingPackage(pkg);
    setFormState({
      name: pkg.name,
      description: pkg.description ?? '',
      category: pkg.category,
      basePrice: pkg.basePrice ? String(pkg.basePrice) : '',
      features: (pkg.features ?? []).join('\n'),
      vendorId: pkg.vendorId ?? '',
      isActive: pkg.isActive,
      tags: (pkg.tags ?? []).join('\n'),
      changeSummary: '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    if (createPackage.isLoading || updatePackage.isLoading || createVersion.isLoading) return;
    setIsFormOpen(false);
    setEditingPackage(null);
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) return;
    setFormError(null);

    const result = buildFormPayload();
    if (result.error || !result.payload) {
      setFormError(result.error ?? 'Unable to process form.');
      return;
    }

    const payload = result.payload;

    try {
      if (editingPackage) {
        await updatePackage.mutateAsync({ id: editingPackage.id, data: payload });
        setBannerMessage('Package updated successfully.');
      } else {
        await createPackage.mutateAsync(payload);
        setBannerMessage('Package created successfully.');
      }
      closeFormModal();
    } catch (error: any) {
      setFormError(error?.message ?? 'Unable to save package.');
    }
  };

  const handleDraftSubmit = async () => {
    if (!canManage || !editingPackage) return;
    setFormError(null);

    const result = buildFormPayload();
    if (result.error || !result.payload) {
      setFormError(result.error ?? 'Unable to process form.');
      return;
    }

    const draftPayload: PackageVersionDraftRequest = {
      ...result.payload,
      changeSummary: formState.changeSummary.trim() || undefined,
    };

    try {
      await createVersion.mutateAsync({ packageId: editingPackage.id, data: draftPayload });
      setBannerMessage('Draft version created.');
      closeFormModal();
    } catch (error: any) {
      setFormError(error?.message ?? 'Unable to create draft version.');
    }
  };

  const togglePackageSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((packageId) => packageId !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (!packages.length) return;
    if (selectedIds.length === packages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(packages.map((pkg) => pkg.id));
    }
  };

  const handleBulkAction = async () => {
    if (!canManage) return;
    if (!selectedIds.length) {
      setBannerMessage('Select at least one package to apply a bulk action.');
      return;
    }

    const requiresTags = ['assign_tags', 'add_tags', 'remove_tags'].includes(bulkActionType);
    const tags = parseTags(bulkTags);

    if (requiresTags && !tags.length) {
      setBannerMessage('Provide at least one tag for this bulk action.');
      return;
    }

    try {
      await bulkMutation.mutateAsync({
        packageIds: selectedIds,
        action: bulkActionType,
        tags: requiresTags ? tags : undefined,
      });
      setBannerMessage('Bulk action completed.');
      setSelectedIds([]);
      if (requiresTags) setBulkTags('');
    } catch (error: any) {
      setBannerMessage(error?.message ?? 'Bulk action failed.');
    }
  };

  const handleSubmitVersionAction = async (packageId: string, versionId: string, comment?: string) => {
    try {
      await submitVersion.mutateAsync({
        packageId,
        versionId,
        data: comment ? { comment } : undefined,
      });
      setBannerMessage('Version submitted for review.');
    } catch (error: any) {
      setBannerMessage(error?.message ?? 'Unable to submit version for review.');
    }
  };

  const handleApproveVersionAction = async (packageId: string, versionId: string) => {
    try {
      await approveVersion.mutateAsync({ packageId, versionId });
      setBannerMessage('Version approved successfully.');
    } catch (error: any) {
      setBannerMessage(error?.message ?? 'Unable to approve version.');
    }
  };

  const handleRejectVersionAction = async (packageId: string, versionId: string, reason?: string) => {
    try {
      await rejectVersion.mutateAsync({ packageId, versionId, data: { reason } });
      setBannerMessage('Version marked for changes.');
    } catch (error: any) {
      setBannerMessage(error?.message ?? 'Unable to request changes.');
    }
  };

  const handleToggleStatus = async (pkg: InsurancePackage) => {
    if (!canManage) return;
    try {
      await updatePackage.mutateAsync({ id: pkg.id, data: { isActive: !pkg.isActive } });
      setBannerMessage(`Package ${pkg.isActive ? 'deactivated' : 'activated'} successfully.`);
    } catch (error: any) {
      setBannerMessage(error?.message ?? 'Failed to update package status.');
    }
  };

  const handleDeletePackage = async (pkg: InsurancePackage) => {
    if (!canManage) return;
    try {
      await removePackage.mutateAsync(pkg.id);
      setBannerMessage('Package deleted successfully.');
      if (selectedPackage?.id === pkg.id) {
        setIsDetailOpen(false);
        setSelectedPackage(null);
      }
    } catch (error: any) {
      setBannerMessage(error?.message ?? 'Failed to delete package.');
    }
  };

  const openDetailModal = (pkg: InsurancePackage) => {
    setSelectedPackage(pkg);
    setDocumentError(null);
    setIsDetailOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailOpen(false);
    setSelectedPackage(null);
    setDocumentError(null);
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPackage) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setDocumentError(null);
    try {
      await uploadDocument.mutateAsync({ packageId: selectedPackage.id, file });
      setBannerMessage('Document uploaded successfully.');
    } catch (error: any) {
      setDocumentError(error?.message ?? 'Failed to upload document.');
    }
  };

  const handleDocumentDelete = async (doc: PolicyDocument) => {
    if (!selectedPackage) return;
    setDocumentError(null);
    try {
      await deleteDocument.mutateAsync({ packageId: selectedPackage.id, documentId: doc.id });
      setBannerMessage('Document deleted successfully.');
    } catch (error: any) {
      setDocumentError(error?.message ?? 'Failed to delete document.');
    }
  };

  const handleDocumentDownload = async (doc: PolicyDocument) => {
    if (!selectedPackage) return;
    setDocumentError(null);
    try {
      const blob = await packagesAPI.downloadDocument(selectedPackage.id, doc.id);
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.fileName ?? 'document';
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setDocumentError(error?.message ?? 'Unable to download document.');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setWorkflowFilter('all');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Packages</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage insurance products and related policy documents.</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <button
            onClick={openCreateModal}
            disabled={!canManage}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            New package
          </button>
          {!canManage && <span className="text-xs text-muted-foreground">You have read-only access.</span>}
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name or description"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 md:col-span-2"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as 'all' | InsurancePackage['category'])}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All categories</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === 'all' ? 'All statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={workflowFilter}
            onChange={(event) => setWorkflowFilter(event.target.value as (typeof WORKFLOW_OPTIONS)[number])}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {WORKFLOW_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All workflows' : option.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Sort by</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortKey)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="rounded border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              {sortOrder === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </div>
          <button onClick={resetFilters} className="text-xs font-medium text-muted-foreground underline">
            Reset filters
          </button>
        </div>
      </section>

      {canManage && (
        <section className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Bulk actions</p>
              <p className="text-xs text-muted-foreground">Apply changes to selected packages in one step.</p>
            </div>
            <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={bulkActionType}
              onChange={(event) => setBulkActionType(event.target.value as BulkActionType)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="activate">Activate</option>
              <option value="deactivate">Deactivate</option>
              <option value="assign_tags">Assign tags</option>
              <option value="add_tags">Add tags</option>
              <option value="remove_tags">Remove tags</option>
            </select>
            {['assign_tags', 'add_tags', 'remove_tags'].includes(bulkActionType) && (
              <input
                value={bulkTags}
                onChange={(event) => setBulkTags(event.target.value)}
                placeholder="Tags (comma or newline separated)"
                className="min-w-[220px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            )}
            <button
              onClick={handleBulkAction}
              disabled={bulkMutation.isLoading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkMutation.isLoading ? 'Applying…' : 'Apply' }
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total" value={stats.total} description="packages in catalog" />
        <StatCard label="Active" value={stats.active} description="currently sellable" />
        <StatCard label="Inactive" value={stats.inactive} description="hidden from listings" />
      </div>

      {bannerMessage && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
          {bannerMessage}
        </div>
      )}

      {isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-destructive-foreground">
          Unable to load packages. Please refresh.
        </div>
      ) : isLoading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
      ) : !packages.length ? (
        <EmptyState
          title="No packages found"
          description="Adjust your filters or add a new insurance package to get started."
          action={
            canManage ? (
              <button
                onClick={openCreateModal}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Add package
              </button>
            ) : null
          }
          className="min-h-[40vh]"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border/70 text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {canManage && (
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={packages.length > 0 && selectedIds.length === packages.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      aria-label="Select all packages"
                    />
                  </th>
                )}
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Base price</th>
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3">Documents</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {packages.map((pkg) => (
                <tr key={pkg.id} className="bg-background/80">
                  {canManage && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(pkg.id)}
                        onChange={() => togglePackageSelection(pkg.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        aria-label={`Select ${pkg.name}`}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDetailModal(pkg)}
                      className="text-left text-sm font-medium text-primary hover:underline"
                    >
                      {pkg.name}
                    </button>
                    <p className="text-xs text-muted-foreground">{pkg.description}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{pkg.category}</td>
                  <td className="px-4 py-3 text-foreground">{formatCurrency(pkg.basePrice)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${workflowBadgeClass(
                        pkg.workflowState,
                      )}`}
                    >
                      {formatWorkflowState(pkg.workflowState)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{pkg.documentCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        pkg.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {pkg.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {canManage ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(pkg)}
                          className="rounded-md border border-border/60 px-3 py-1 font-medium text-muted-foreground hover:bg-muted"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(pkg)}
                          disabled={updatePackage.isLoading}
                          className="rounded-md border border-border/60 px-3 py-1 font-medium text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pkg.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeletePackage(pkg)}
                          disabled={removePackage.isLoading}
                          className="rounded-md border border-destructive/50 px-3 py-1 font-medium text-destructive-foreground hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">View only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isFormOpen && (
        <PackageFormModal
          mode={editingPackage ? 'edit' : 'create'}
          values={formState}
          vendors={vendors}
          onChange={(field, value) => setFormState((prev) => ({ ...prev, [field]: value }))}
          onSubmit={handleFormSubmit}
          onClose={closeFormModal}
          isSubmitting={createPackage.isLoading || updatePackage.isLoading}
          error={formError}
          onSubmitDraft={editingPackage ? handleDraftSubmit : undefined}
          isDraftSubmitting={createVersion.isLoading}
        />
      )}

      {isDetailOpen && selectedPackage && (
        <PackageDetailModal
          pkg={selectedPackage}
          documents={documents}
          loadingDocuments={documentsLoading}
          canManage={canManage}
          onClose={closeDetailModal}
          onUpload={() => documentInputRef.current?.click()}
          onDownload={handleDocumentDownload}
          onDelete={handleDocumentDelete}
          documentError={documentError}
          isUploading={uploadDocument.isLoading}
          isDeleting={deleteDocument.isLoading}
          onSubmitVersion={(versionId, comment) => handleSubmitVersionAction(selectedPackage.id, versionId, comment)}
          onApproveVersion={(versionId) => handleApproveVersionAction(selectedPackage.id, versionId)}
          onRejectVersion={(versionId, reason) => handleRejectVersionAction(selectedPackage.id, versionId, reason)}
          submittingVersion={submitVersion.isLoading}
          approvingVersion={approveVersion.isLoading}
          rejectingVersion={rejectVersion.isLoading}
        />
      )}

      <input
        ref={documentInputRef}
        type="file"
        className="hidden"
        onChange={handleDocumentUpload}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
      />
    </div>
  );
}

function PackageDetailModal({
  pkg,
  documents,
  loadingDocuments,
  canManage,
  onClose,
  onUpload,
  onDownload,
  onDelete,
  documentError,
  isUploading,
  isDeleting,
  onSubmitVersion,
  onApproveVersion,
  onRejectVersion,
  submittingVersion,
  approvingVersion,
  rejectingVersion,
}: {
  pkg: InsurancePackage;
  documents: PolicyDocument[];
  loadingDocuments: boolean;
  canManage: boolean;
  onClose: () => void;
  onUpload: () => void;
  onDownload: (doc: PolicyDocument) => void;
  onDelete: (doc: PolicyDocument) => void;
  documentError: string | null;
  isUploading: boolean;
  isDeleting: boolean;
  onSubmitVersion: (versionId: string, comment?: string) => Promise<void>;
  onApproveVersion: (versionId: string) => Promise<void>;
  onRejectVersion: (versionId: string, reason?: string) => Promise<void>;
  submittingVersion: boolean;
  approvingVersion: boolean;
  rejectingVersion: boolean;
}) {
  const versions: PolicyVersion[] = [...(pkg.versions ?? [])].sort((a, b) => b.version - a.version);
  const disableVersionActions = submittingVersion || approvingVersion || rejectingVersion;
  const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : '—');

  const handleSubmitVersion = async (versionId: string) => {
    const comment = window.prompt('Comment for reviewers (optional)')?.trim();
    await onSubmitVersion(versionId, comment ? comment : undefined);
  };

  const handleApproveVersion = async (versionId: string) => {
    await onApproveVersion(versionId);
  };

  const handleRejectVersion = async (versionId: string) => {
    const reason = window.prompt('Reason for requesting changes (optional)')?.trim();
    await onRejectVersion(versionId, reason ? reason : undefined);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Package details</h2>
            <p className="text-sm text-muted-foreground">Review metadata, features, and supporting documents.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border/60 px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-6">
          <section className="rounded-lg border border-border/70 bg-card/60 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="Package" value={pkg.name} />
              <DetailItem label="Category" value={pkg.category} />
              <DetailItem label="Base price" value={formatCurrency(pkg.basePrice)} />
              <DetailItem label="Status" value={pkg.isActive ? 'Active' : 'Inactive'} variant={pkg.isActive ? 'success' : 'warning'} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Workflow</span>
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${workflowBadgeClass(pkg.workflowState)}`}>
                {formatWorkflowState(pkg.workflowState)}
              </span>
              {pkg.latestVersion != null && (
                <span className="text-xs text-muted-foreground">Latest version v{pkg.latestVersion}</span>
              )}
            </div>
            {pkg.description && <p className="mt-4 text-sm text-foreground/90">{pkg.description}</p>}
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tags</p>
              {pkg.tags?.length ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  {pkg.tags.map((tag: string) => (
                    <span key={tag} className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No tags assigned.</p>
              )}
            </div>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Features</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground/90">
                {(pkg.features ?? []).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
                {!pkg.features?.length && <li className="text-muted-foreground">No features listed.</li>}
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-border/70 bg-card/60 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Documents</p>
                <p className="text-xs text-muted-foreground">Attach and manage supporting policy documents.</p>
              </div>
              {canManage && (
                <button
                  onClick={onUpload}
                  disabled={isUploading}
                  className="rounded-md border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? 'Uploading…' : 'Upload'}
                </button>
              )}
            </div>

            {documentError && (
              <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {documentError}
              </div>
            )}

            {loadingDocuments ? (
              <div className="flex min-h-[140px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
              </div>
            ) : documents.length ? (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/70 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.fileSize)} • {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => onDownload(doc)}
                        className="rounded-md border border-border/60 px-3 py-1 font-medium text-muted-foreground hover:bg-muted"
                      >
                        Download
                      </button>
                      {canManage && (
                        <button
                          onClick={() => onDelete(doc)}
                          disabled={isDeleting}
                          className="rounded-md border border-destructive/50 px-3 py-1 font-medium text-destructive-foreground hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            )}
          </section>

          <section className="rounded-lg border border-border/70 bg-card/60 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Version history</p>
                <p className="text-xs text-muted-foreground">Track edits and manage review workflows.</p>
              </div>
            </div>
            {versions.length ? (
              <div className="space-y-3">
                {versions.map((version) => {
                  const statusClass = workflowBadgeClass(version.status as InsurancePackage['workflowState']);
                  const isCurrent = pkg.currentVersionId === version.id;
                  const canSubmit = ['draft', 'changes_requested'].includes(version.status);
                  const canReview = version.status === 'pending_review';
                  return (
                    <div
                      key={version.id}
                      className="rounded-lg border border-border/60 bg-card/70 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            Version v{version.version}
                            {isCurrent && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                                Current
                              </span>
                            )}
                          </p>
                          {version.changeSummary && (
                            <p className="text-xs text-muted-foreground">{version.changeSummary}</p>
                          )}
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}>
                          {formatWorkflowState(version.status as InsurancePackage['workflowState'])}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <p>Created: {formatDateTime(version.createdAt)} {version.createdBy && `• ${version.createdBy}`}</p>
                        <p>Submitted: {formatDateTime(version.submittedAt)} {version.submittedBy && `• ${version.submittedBy}`}</p>
                        <p>Approved: {formatDateTime(version.approvedAt)} {version.approvedBy && `• ${version.approvedBy}`}</p>
                        <p>Changes requested: {version.rejectedReason ? version.rejectedReason : '—'}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(version.tags ?? []).map((tag: string) => (
                          <span key={`${version.id}-${tag}`} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                      {canManage && (canSubmit || canReview) && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {canSubmit && (
                            <button
                              onClick={() => void handleSubmitVersion(version.id)}
                              disabled={disableVersionActions}
                              className="rounded-md border border-border/60 px-3 py-1 font-medium text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {version.status === 'changes_requested' ? 'Resubmit' : 'Submit for review'}
                            </button>
                          )}
                          {canReview && (
                            <>
                              <button
                                onClick={() => void handleApproveVersion(version.id)}
                                disabled={disableVersionActions}
                                className="rounded-md border border-emerald-500/60 px-3 py-1 font-medium text-emerald-500 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => void handleRejectVersion(version.id)}
                                disabled={disableVersionActions}
                                className="rounded-md border border-amber-500/60 px-3 py-1 font-medium text-amber-500 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Request changes
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No version history recorded yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: 'success' | 'warning';
}) {
  const badgeClass =
    variant === 'success'
      ? 'bg-emerald-500/10 text-emerald-500'
      : variant === 'warning'
      ? 'bg-amber-500/10 text-amber-500'
      : null;

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {badgeClass ? (
        <span className={`mt-1 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${badgeClass}`}>
          {value}
        </span>
      ) : (
        <p className="mt-1 text-sm text-foreground">{value}</p>
      )}
    </div>
  );
}

function PackageFormModal({
  mode,
  values,
  vendors,
  onChange,
  onSubmit,
  onClose,
  isSubmitting,
  error,
  onSubmitDraft,
  isDraftSubmitting,
}: {
  mode: 'create' | 'edit';
  values: PackageFormState;
  vendors: Vendor[];
  onChange: (field: keyof PackageFormState, value: string | boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  isSubmitting: boolean;
  error: string | null;
  onSubmitDraft?: () => void;
  isDraftSubmitting?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {mode === 'edit' ? 'Edit package' : 'Create package'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            disabled={isSubmitting || isDraftSubmitting}
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
                onChange={(event) => onChange('name', event.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</label>
              <select
                value={values.category}
                onChange={(event) => onChange('category', event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Base price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={values.basePrice}
                onChange={(event) => onChange('basePrice', event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vendor</label>
              <select
                value={values.vendorId}
                onChange={(event) => onChange('vendorId', event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Unassigned</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</label>
            <textarea
              value={values.description}
              onChange={(event) => onChange('description', event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Features (one per line)</label>
            <textarea
              value={values.features}
              onChange={(event) => onChange('features', event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags (comma or newline separated)</label>
            <textarea
              value={values.tags}
              onChange={(event) => onChange('tags', event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {mode === 'edit' && (
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Change summary (for draft submissions)</label>
              <textarea
                value={values.changeSummary}
                onChange={(event) => onChange('changeSummary', event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          )}

          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => onChange('isActive', event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Active package
          </label>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              disabled={isSubmitting || isDraftSubmitting}
            >
              Cancel
            </button>
            {mode === 'edit' && onSubmitDraft && (
              <button
                type="button"
                onClick={onSubmitDraft}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting || isDraftSubmitting}
              >
                {isDraftSubmitting ? 'Saving draft…' : 'Save draft'}
              </button>
            )}
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              disabled={isSubmitting || isDraftSubmitting}
            >
              {isSubmitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
