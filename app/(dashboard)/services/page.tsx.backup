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

  useEffect(() => {
    const nextDrafts: Record<string, ServiceDraft> = {};
    services.forEach((service) => {
      // eslint-disable-next-line security/detect-object-injection
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

  /* eslint-disable security/detect-object-injection */
  const updateDraft = (key: string, updates: Partial<ServiceDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      // eslint-disable-next-line security/detect-object-injection
      [key]: {
        // eslint-disable-next-line security/detect-object-injection
        ...prev[key],
        ...updates,
      },
    }));
  };
  /* eslint-enable security/detect-object-injection */

  const handleToggle = async (service: ServiceDefinition) => {
    if (!canManage) return;
    const draft = drafts[service.key];
    const desired = !(draft?.enabled ?? service.enabled);

    updateDraft(service.key, { enabled: desired }); // eslint-disable-line security/detect-object-injection

    await handleSave(service.key, {
      enabled: desired,
    });
  };

  /* eslint-disable security/detect-object-injection */
  const handleFieldChange = (serviceKey: string, field: keyof ServiceDraft, value: string | boolean) => {
    if (typeof value === 'boolean') {
      updateDraft(serviceKey, { [field]: value } as Partial<ServiceDraft>); // eslint-disable-line security/detect-object-injection
    } else {
      updateDraft(serviceKey, { [field]: value }); // eslint-disable-line security/detect-object-injection
    }
  };
  /* eslint-enable security/detect-object-injection */

  const handleSave = async (serviceKey: string, override?: Partial<ServiceUpdatePayload>) => {
    if (!canManage) return;
    const service = services.find((item) => item.key === serviceKey);
    const draft = drafts[serviceKey]; // eslint-disable-line security/detect-object-injection
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground">
            Toggle availability and adjust baseline pricing for each insurance service offered by the bot.
          </p>
        </div>
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
                  No services configured yet.
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
