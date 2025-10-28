'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  useOnboardingRequests,
  useCreateOnboardingRequest,
  useApproveOnboardingRequest,
  useRejectOnboardingRequest,
  useUpdateOnboardingRequest,
} from '@/hooks/useOnboarding';
import { useVendors } from '@/hooks/useVendors';
import { tenantsAPI, usersAPI } from '@/lib/api';
import type { PartnerOnboardingRequest, TenantDefinition, AdminUser } from '@/types/api';

type FilterOption = {
  key: string | null;
  label: string;
};

const STATUS_OPTIONS: FilterOption[] = [
  { key: null, label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  submitted: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

const ButtonClass =
  'inline-flex items-center justify-center rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60';

const OutlineButtonClass =
  'inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60';

const InputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const TextareaClass =
  'min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const summarizeData = (data: Record<string, any>): Array<{ key: string; value: string }> =>
  Object.entries(data || {}).map(([key, value]) => {
    if (value === null || value === undefined) {
      return { key, value: '—' };
    }
    if (typeof value === 'object') {
      return { key, value: JSON.stringify(value, null, 2) };
    }
    return { key, value: String(value) };
  });

export default function PartnerOnboardingPage() {
  const [statusFilter, setStatusFilter] = useState<string | null>('submitted');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ partnerId: '', tenantId: '', vendorId: '', notes: '' });
  const [assignments, setAssignments] = useState({ tenantId: '', vendorId: '' });
  const [decisionNotes, setDecisionNotes] = useState('');

  const requestParams = statusFilter ? { status: statusFilter } : undefined;
  const onboardingQuery = useOnboardingRequests(requestParams);
  const vendorsQuery = useVendors();
  const tenantsQuery = useQuery<TenantDefinition[]>(['tenants', 'all'], async () => {
    const response = await tenantsAPI.list(true);
    return response.data ?? [];
  });
  const partnersQuery = useQuery<AdminUser[]>(['admin-users', 'partner'], async () => {
    const response = await usersAPI.getAll({ role: 'partner', status: 'active' });
    return response.data ?? [];
  });

  const createMutation = useCreateOnboardingRequest();
  const updateMutation = useUpdateOnboardingRequest();
  const approveMutation = useApproveOnboardingRequest();
  const rejectMutation = useRejectOnboardingRequest();

  const requests = onboardingQuery.data ?? [];
  const selectedRequest = useMemo<PartnerOnboardingRequest | null>(() => {
    if (!requests.length) return null;
    if (selectedId) {
      return requests.find((item) => item.id === selectedId) ?? null;
    }
    return requests[0] ?? null;
  }, [requests, selectedId]);

  const tenants = tenantsQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];
  const partners = partnersQuery.data ?? [];

  const handleSelectRequest = (requestId: string) => {
    setSelectedId(requestId);
    setDecisionNotes('');
    const target = requests.find((item) => item.id === requestId);
    setAssignments({
      tenantId: target?.tenantId ?? '',
      vendorId: target?.vendorId ?? '',
    });
  };

  useEffect(() => {
    if (selectedRequest) {
      setAssignments({
        tenantId: selectedRequest.tenantId ?? '',
        vendorId: selectedRequest.vendorId ?? '',
      });
    }
  }, [selectedRequest?.id, selectedRequest?.tenantId, selectedRequest?.vendorId]);

  const handleCreateRequest = async () => {
    if (!createForm.partnerId) return;
    try {
      const payload = {
        userId: createForm.partnerId,
        tenantId: createForm.tenantId || undefined,
        vendorId: createForm.vendorId || undefined,
        data: createForm.notes ? { notes: createForm.notes } : undefined,
      };
      const response = await createMutation.mutateAsync(payload);
      if (response) {
        setShowCreate(false);
        setCreateForm({ partnerId: '', tenantId: '', vendorId: '', notes: '' });
        setSelectedId(response.id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateAssignments = async () => {
    if (!selectedRequest) return;
    try {
      await updateMutation.mutateAsync({
        requestId: selectedRequest.id,
        payload: {
          tenantId: assignments.tenantId || null,
          vendorId: assignments.vendorId || null,
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      await approveMutation.mutateAsync({
        requestId: selectedRequest.id,
        payload: decisionNotes ? { reason: decisionNotes } : undefined,
      });
      setDecisionNotes('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !decisionNotes.trim()) return;
    try {
      await rejectMutation.mutateAsync({
        requestId: selectedRequest.id,
        payload: { reason: decisionNotes },
      });
      setDecisionNotes('');
    } catch (error) {
      console.error(error);
    }
  };

  const loading = onboardingQuery.isLoading;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Partner onboarding</h1>
          <p className="text-sm text-muted-foreground">
            Track onboarding submissions from partner teams and manage approvals.
          </p>
        </div>
        <button
          type="button"
          className={ButtonClass}
          onClick={() => {
            setShowCreate((prev) => !prev);
            setCreateForm({ partnerId: '', tenantId: '', vendorId: '', notes: '' });
          }}
        >
          {showCreate ? 'Close form' : 'New request'}
        </button>
      </header>

      {showCreate && (
        <section className="space-y-4 rounded-lg border border-border/60 bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Create onboarding request</h2>
            <p className="text-sm text-muted-foreground">
              Select a partner user and optional context. Partners will be notified to complete their details.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Partner user
              </label>
              <select
                className={InputClass}
                value={createForm.partnerId}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, partnerId: event.target.value }))}
              >
                <option value="">Select partner</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name || partner.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tenant context
              </label>
              <select
                className={InputClass}
                value={createForm.tenantId}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, tenantId: event.target.value }))}
              >
                <option value="">No tenant preference</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Vendor alignment
              </label>
              <select
                className={InputClass}
                value={createForm.vendorId}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, vendorId: event.target.value }))}
              >
                <option value="">No vendor attached</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notes for partner (optional)
              </label>
              <textarea
                className={TextareaClass}
                value={createForm.notes}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Provide any context the partner should see during onboarding."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={OutlineButtonClass}
              onClick={() => {
                setShowCreate(false);
                setCreateForm({ partnerId: '', tenantId: '', vendorId: '', notes: '' });
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={ButtonClass}
              onClick={handleCreateRequest}
              disabled={!createForm.partnerId || createMutation.isLoading}
            >
              {createMutation.isLoading ? 'Creating…' : 'Create request'}
            </button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((option) => {
            const active = statusFilter === option.key;
            return (
              <button
                key={option.label}
                type="button"
                className={`${OutlineButtonClass} ${active ? 'border-primary text-primary' : ''}`}
                onClick={() => {
                  setStatusFilter(option.key);
                  setSelectedId(null);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <aside className="rounded-lg border border-border/60 bg-card shadow-sm">
            <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold text-muted-foreground">
              Requests
            </div>
            <div className="max-h-[520px] divide-y divide-border/40 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center px-4 py-12 text-sm text-muted-foreground">
                  Loading requests…
                </div>
              ) : requests.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">No onboarding requests found.</div>
              ) : (
                requests.map((request) => {
                  const active = selectedRequest?.id === request.id;
                  const statusClass = STATUS_STYLES[request.status] ?? 'bg-muted text-foreground border-border';
                  return (
                    <button
                      key={request.id}
                      type="button"
                      className={`w-full px-4 py-3 text-left text-sm transition ${
                        active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      }`}
                      onClick={() => handleSelectRequest(request.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{request.user?.name || request.user?.email}</span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass}`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Created {formatDateTime(request.createdAt)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="space-y-4 rounded-lg border border-border/60 bg-card p-6 shadow-sm">
            {selectedRequest ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {selectedRequest.user?.name || selectedRequest.user?.email || 'Partner onboarding'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Request ID: {selectedRequest.id}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                        STATUS_STYLES[selectedRequest.status] ?? 'bg-muted text-foreground border-border'
                      }`}
                    >
                      {selectedRequest.status}
                    </span>
                    {selectedRequest.tenant && (
                      <span className="text-xs text-muted-foreground">Tenant: {selectedRequest.tenant.name}</span>
                    )}
                    {selectedRequest.vendor && (
                      <span className="text-xs text-muted-foreground">Vendor: {selectedRequest.vendor.name}</span>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                    <div className="font-semibold text-foreground">Timestamps</div>
                    <dl className="mt-2 space-y-1">
                      <div className="flex justify-between gap-4">
                        <dt>Created</dt>
                        <dd>{formatDateTime(selectedRequest.createdAt)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Submitted</dt>
                        <dd>{formatDateTime(selectedRequest.submittedAt)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Approved</dt>
                        <dd>{formatDateTime(selectedRequest.approvedAt)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Rejected</dt>
                        <dd>{formatDateTime(selectedRequest.rejectedAt)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                    <div className="font-semibold text-foreground">Assignments</div>
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wide text-muted-foreground">Tenant</label>
                        <select
                          className={InputClass}
                          value={assignments.tenantId}
                          onChange={(event) => setAssignments((prev) => ({ ...prev, tenantId: event.target.value }))}
                          disabled={updateMutation.isLoading}
                        >
                          <option value="">Unassigned</option>
                          {tenants.map((tenant) => (
                            <option key={tenant.id} value={tenant.id}>
                              {tenant.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wide text-muted-foreground">Vendor</label>
                        <select
                          className={InputClass}
                          value={assignments.vendorId}
                          onChange={(event) => setAssignments((prev) => ({ ...prev, vendorId: event.target.value }))}
                          disabled={updateMutation.isLoading}
                        >
                          <option value="">Unassigned</option>
                          {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        className={`${OutlineButtonClass} mt-2`}
                        onClick={handleUpdateAssignments}
                        disabled={updateMutation.isLoading}
                      >
                        {updateMutation.isLoading ? 'Saving…' : 'Save assignments'}
                      </button>
                    </div>
                  </div>
                </div>

                {selectedRequest.rejectionReason && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    Rejection notes: {selectedRequest.rejectionReason}
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Partner submission</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {summarizeData(selectedRequest.data).map((item) => (
                      <div key={item.key} className="rounded-md border border-border/60 bg-muted/10 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {item.key}
                        </div>
                        <pre className="mt-2 whitespace-pre-wrap text-xs text-foreground">{item.value}</pre>
                      </div>
                    ))}
                  </div>
                  {selectedRequest.data?.notes && (
                    <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
                      Partner notes: {selectedRequest.data.notes}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-4">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Decision notes
                  </label>
                  <textarea
                    className={TextareaClass}
                    value={decisionNotes}
                    onChange={(event) => setDecisionNotes(event.target.value)}
                    placeholder="Leave guidance for the partner or internal reviewers."
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className={`${OutlineButtonClass} border-emerald-600 text-emerald-600`}
                      onClick={handleApprove}
                      disabled={selectedRequest.status !== 'submitted' || approveMutation.isLoading}
                    >
                      {approveMutation.isLoading ? 'Approving…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className={`${OutlineButtonClass} border-destructive text-destructive`}
                      onClick={handleReject}
                      disabled={
                        selectedRequest.status !== 'submitted' || !decisionNotes.trim() || rejectMutation.isLoading
                      }
                    >
                      {rejectMutation.isLoading ? 'Rejecting…' : 'Reject'}
                    </button>
                  </div>
                  {selectedRequest.status !== 'submitted' && (
                    <p className="text-xs text-muted-foreground">
                      Approvals and rejections are available when a partner has submitted their onboarding data.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select a request to view details.
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
