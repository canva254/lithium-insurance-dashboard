'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { servicesAPI } from '@/lib/api';
import { ACTION_PERMISSIONS, isRoleAllowed } from '@/lib/permissions';
import { useRole } from '@/hooks/useRole';
import type { ServiceDefinition, ServiceUpdatePayload } from '@/types/api';

const SERVICES_QUERY_KEY = ['services', { includeDisabled: true }] as const;

type ServiceDraft = {
  label: string;
  enabled: boolean;
  min_premium: string;
  commission_rate: string;
  pricing_strategy: string;
};

type NewServiceForm = {
  service_key: string;
  name: string;
  label: string;
  description: string;
  enabled: boolean;
  workflow_key: string;
  min_premium: string;
  commission_rate: string;
  pricing_strategy: string;
};

const equalsNullableNumber = (a?: number | null, b?: number | null) => {
  const normA = a ?? null;
  const normB = b ?? null;
  return normA === normB;
};

export default function ServicesPage() {
  const { role } = useRole();
  const canManage = isRoleAllowed(role, ACTION_PERMISSIONS.manageServices);

  const [drafts, setDrafts] = useState<Record<string, ServiceDraft>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newService, setNewService] = useState<NewServiceForm>({
    service_key: '',
    name: '',
    label: '',
    description: '',
    enabled: true,
    workflow_key: '',
    min_premium: '',
    commission_rate: '',
    pricing_strategy: '',
  });

  const queryClient = useQueryClient();
  const {
    data: services = [],
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery<ServiceDefinition[]>(
    SERVICES_QUERY_KEY,
    async () => {
      const response = await servicesAPI.list(true);
      return response.data ?? [];
    },
  );

  const updateService = useMutation(
    async ({ serviceKey, payload }: { serviceKey: string; payload: ServiceUpdatePayload }) =>
      servicesAPI.update(serviceKey, payload),
    {
      onSuccess: (response, variables) => {
        const updated = response.data;
        if (updated) {
          queryClient.setQueryData<ServiceDefinition[]>(SERVICES_QUERY_KEY, (previous = []) =>
            previous.map((item) => (item.key === variables.serviceKey ? updated : item)),
          );
        } else {
          void queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
        }
        setBanner('Service updated successfully.');
        setError(null);
      },
      onError: (mutationError: any) => {
        setError(mutationError?.message ?? 'Unable to update service.');
      },
    },
  );

  const createService = useMutation(
    async (payload: any) => servicesAPI.create(payload),
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
        setShowAddForm(false);
        setNewService({
          service_key: '',
          name: '',
          label: '',
          description: '',
          enabled: true,
          workflow_key: '',
          min_premium: '',
          commission_rate: '',
          pricing_strategy: '',
        });
        setBanner('Service created successfully.');
        setError(null);
      },
      onError: (mutationError: any) => {
        setError(mutationError?.response?.data?.error ?? mutationError?.message ?? 'Failed to create service.');
      },
    },
  );

  const deleteService = useMutation(
    async (serviceKey: string) => servicesAPI.delete(serviceKey),
    {
      onSuccess: (_, deletedKey) => {
        queryClient.setQueryData<ServiceDefinition[]>(SERVICES_QUERY_KEY, (previous = []) =>
          previous.filter((item) => item.key !== deletedKey),
        );
        setBanner('Service deleted successfully.');
        setError(null);
      },
      onError: (mutationError: any) => {
        setError(mutationError?.message ?? 'Failed to delete service.');
      },
    },
  );

  useEffect(() => {
    const nextDrafts: Record<string, ServiceDraft> = {};
    services.forEach((service) => {
      nextDrafts[service.key] = {
        label: service.label,
        enabled: service.enabled,
        min_premium: service.min_premium != null ? String(service.min_premium) : '',
        commission_rate: service.commission_rate != null ? String(service.commission_rate) : '',
        pricing_strategy: service.pricing_strategy ?? '',
      };
    });
    setDrafts(nextDrafts);
  }, [services]);

  const updateDraft = (key: string, updates: Partial<ServiceDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...updates,
      },
    }));
  };

  const handleToggle = async (service: ServiceDefinition) => {
    if (!canManage) return;
    const draft = drafts[service.key];
    const desired = !(draft?.enabled ?? service.enabled);

    updateDraft(service.key, { enabled: desired });

    await handleSave(service.key, {
      enabled: desired,
    });
  };

  const handleFieldChange = (serviceKey: string, field: keyof ServiceDraft, value: string | boolean) => {
    if (typeof value === 'boolean') {
      updateDraft(serviceKey, { [field]: value } as Partial<ServiceDraft>);
    } else {
      updateDraft(serviceKey, { [field]: value });
    }
  };

  const handleSave = async (serviceKey: string, override?: Partial<ServiceUpdatePayload>) => {
    if (!canManage) return;
    const service = services.find((item) => item.key === serviceKey);
    const draft = drafts[serviceKey];
    if (!service || !draft) return;

    const parseNullableNumber = (value: string) => {
      if (value.trim() === '') return null;
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        throw new Error('Enter a valid number.');
      }
      return parsed;
    };

    const payload: ServiceUpdatePayload = { ...(override ?? {}) };

    if (override?.label === undefined && draft.label !== service.label) {
      payload.label = draft.label;
    }
    if (override?.enabled === undefined && draft.enabled !== service.enabled) {
      payload.enabled = draft.enabled;
    }

    try {
      if (override?.min_premium === undefined) {
        const draftMin = parseNullableNumber(draft.min_premium);
        if (!equalsNullableNumber(draftMin, service.min_premium ?? null)) {
          payload.min_premium = draftMin;
        }
      }
      if (override?.commission_rate === undefined) {
        const draftCommission = parseNullableNumber(draft.commission_rate);
        if (!equalsNullableNumber(draftCommission, service.commission_rate ?? null)) {
          payload.commission_rate = draftCommission;
        }
      }
    } catch (numberError: any) {
      setError(numberError?.message ?? 'Invalid numeric input.');
      return;
    }

    if (override?.pricing_strategy === undefined) {
      if ((draft.pricing_strategy || null) !== (service.pricing_strategy ?? null)) {
        payload.pricing_strategy = draft.pricing_strategy || null;
      }
    }

    if (Object.keys(payload).length === 0) {
      setBanner('No changes to save.');
      return;
    }

    setSaving((prev) => ({ ...prev, [serviceKey]: true }));
    setError(null);
    try {
      await updateService.mutateAsync({ serviceKey, payload });
    } catch {
      void queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    } finally {
      setSaving((prev) => ({ ...prev, [serviceKey]: false }));
    }
  };

  const handleCreateService = async () => {
    if (!canManage) return;

    // Validation
    if (!newService.service_key.trim()) {
      setError('Service key is required');
      return;
    }
    if (!newService.name.trim()) {
      setError('Service name is required');
      return;
    }

    const payload: any = {
      service_key: newService.service_key.trim(),
      name: newService.name.trim(),
      label: newService.label.trim() || newService.name.trim(),
      description: newService.description.trim() || null,
      enabled: newService.enabled,
      workflow_key: newService.workflow_key.trim() || null,
      min_premium: newService.min_premium ? parseFloat(newService.min_premium) : null,
      commission_rate: newService.commission_rate ? parseFloat(newService.commission_rate) : null,
      pricing_strategy: newService.pricing_strategy.trim() || null,
    };

    setError(null);
    await createService.mutateAsync(payload);
  };

  const handleDeleteService = async (serviceKey: string) => {
    if (!canManage) return;
    if (!confirm(`Are you sure you want to delete service "${serviceKey}"? This action cannot be undone.`)) {
      return;
    }
    await deleteService.mutateAsync(serviceKey);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground">
            Manage insurance services offered by the bot. Add new services, toggle availability, and adjust pricing.
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? 'Cancel' : '+ Add Service'}
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
            onClick={() => {
              void refetch();
            }}
            disabled={isFetching}
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {banner && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {banner}
        </div>
      )}

      {(error ?? (queryError instanceof Error ? queryError.message : null)) && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error ?? (queryError instanceof Error ? queryError.message : 'Unable to load services.')}
        </div>
      )}

      {/* Add Service Form */}
      {showAddForm && canManage && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Add New Service</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Service Key <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g., motor_insurance"
                value={newService.service_key}
                onChange={(e) => setNewService({ ...newService, service_key: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g., Motor Insurance"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Label</label>
              <input
                type="text"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g., Motor Insurance"
                value={newService.label}
                onChange={(e) => setNewService({ ...newService, label: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Workflow Key</label>
              <input
                type="text"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g., motor_insurance_workflow"
                value={newService.workflow_key}
                onChange={(e) => setNewService({ ...newService, workflow_key: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Min Premium</label>
              <input
                type="number"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g., 5000"
                value={newService.min_premium}
                onChange={(e) => setNewService({ ...newService, min_premium: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Commission Rate</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g., 0.15"
                value={newService.commission_rate}
                onChange={(e) => setNewService({ ...newService, commission_rate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Pricing Strategy</label>
              <input
                type="text"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g., mock_table_v1"
                value={newService.pricing_strategy}
                onChange={(e) => setNewService({ ...newService, pricing_strategy: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Enabled</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={newService.enabled ? 'true' : 'false'}
                onChange={(e) => setNewService({ ...newService, enabled: e.target.value === 'true' })}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Brief description of this service..."
                rows={3}
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              onClick={handleCreateService}
              disabled={createService.isLoading}
            >
              {createService.isLoading ? 'Creating…' : 'Create Service'}
            </button>
          </div>
        </div>
      )}

      {/* Services Table */}
      <div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
        <table className="min-w-full divide-y divide-border/60">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Min premium</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Pricing strategy</th>
              <th className="px-4 py-3">Workflow</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  Loading services…
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  No services configured yet. Click &quot;Add Service&quot; to create one.
                </td>
              </tr>
            ) : (
              services.map((service) => {
                const draft = drafts[service.key];
                const isSaving = saving[service.key];
                return (
                  <tr key={service.key} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-medium text-foreground">{service.name}</div>
                      <div className="text-xs text-muted-foreground">{service.description ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        Tenant: {service.tenant_id ?? 'Global'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        value={draft?.label ?? ''}
                        disabled={!canManage || isSaving}
                        onChange={(event) => handleFieldChange(service.key, 'label', event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            draft?.enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-600'
                          }`}
                        >
                          {draft?.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          v{service.version_number ?? '—'} · {(service.status ?? 'unknown').replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="e.g. 5000"
                        value={draft?.min_premium ?? ''}
                        disabled={!canManage || isSaving}
                        onChange={(event) => handleFieldChange(service.key, 'min_premium', event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="e.g. 0.15"
                        value={draft?.commission_rate ?? ''}
                        disabled={!canManage || isSaving}
                        onChange={(event) => handleFieldChange(service.key, 'commission_rate', event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="mock_table_v1"
                        value={draft?.pricing_strategy ?? ''}
                        disabled={!canManage || isSaving}
                        onChange={(event) => handleFieldChange(service.key, 'pricing_strategy', event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {service.workflow_key ?? '—'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!canManage || isSaving}
                          onClick={() => handleToggle(service)}
                        >
                          {draft?.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!canManage || isSaving}
                          onClick={() => handleSave(service.key)}
                        >
                          {isSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive shadow-sm hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!canManage || deleteService.isLoading}
                          onClick={() => handleDeleteService(service.key)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
