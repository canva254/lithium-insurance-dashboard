'use client';

import { useEffect, useMemo, useState } from 'react';

import { tenantsAPI, servicesAPI } from '@/lib/api';
import { ACTION_PERMISSIONS, isRoleAllowed } from '@/lib/permissions';
import { useRole } from '@/hooks/useRole';
import type {
  TenantDefinition,
  TenantCreatePayload,
  TenantUpdatePayload,
  ServiceDefinition,
  TenantServiceOverride,
  TenantServiceOverrideRequest,
} from '@/types/api';

type TenantForm = {
  name: string;
  slug: string;
  description: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  favicon_url: string;
  support_email: string;
  support_phone: string;
  is_active: boolean;
};

type OverrideFormState = {
  id: string | null;
  serviceId: string;
  status: string;
  overrideJson: string;
};

const emptyForm = (): TenantForm => ({
  name: '',
  slug: '',
  description: '',
  primary_color: '',
  secondary_color: '',
  accent_color: '',
  logo_url: '',
  favicon_url: '',
  support_email: '',
  support_phone: '',
  is_active: true,
});

const emptyOverrideForm = (): OverrideFormState => ({
  id: null,
  serviceId: '',
  status: 'active',
  overrideJson: '{\n  \n}',
});

const overrideStatuses = ['active', 'pending', 'disabled'] as const;

const toForm = (tenant: TenantDefinition): TenantForm => ({
  name: tenant.name,
  slug: tenant.slug,
  description: tenant.description ?? '',
  primary_color: tenant.primary_color ?? '',
  secondary_color: tenant.secondary_color ?? '',
  accent_color: tenant.accent_color ?? '',
  logo_url: tenant.logo_url ?? '',
  favicon_url: tenant.favicon_url ?? '',
  support_email: tenant.support_email ?? '',
  support_phone: tenant.support_phone ?? '',
  is_active: tenant.is_active,
});

const diffPayload = (current: TenantDefinition | null, form: TenantForm): TenantUpdatePayload => {
  const updates: TenantUpdatePayload = {};
  if (!current || current.name !== form.name) updates.name = form.name;
  if (!current || current.slug !== form.slug) updates.slug = form.slug || undefined;
  if (!current || (current.description ?? '') !== form.description) updates.description = form.description || undefined;
  if (!current || (current.primary_color ?? '') !== form.primary_color) updates.primary_color = form.primary_color || undefined;
  if (!current || (current.secondary_color ?? '') !== form.secondary_color)
    updates.secondary_color = form.secondary_color || undefined;
  if (!current || (current.accent_color ?? '') !== form.accent_color) updates.accent_color = form.accent_color || undefined;
  if (!current || (current.logo_url ?? '') !== form.logo_url) updates.logo_url = form.logo_url || undefined;
  if (!current || (current.favicon_url ?? '') !== form.favicon_url) updates.favicon_url = form.favicon_url || undefined;
  if (!current || (current.support_email ?? '') !== form.support_email)
    updates.support_email = form.support_email || undefined;
  if (!current || (current.support_phone ?? '') !== form.support_phone)
    updates.support_phone = form.support_phone || undefined;
  if (!current || current.is_active !== form.is_active) updates.is_active = form.is_active;
  return updates;
};

const createPayloadFromForm = (form: TenantForm): TenantCreatePayload => ({
  name: form.name,
  slug: form.slug || undefined,
  description: form.description || undefined,
  primary_color: form.primary_color || undefined,
  secondary_color: form.secondary_color || undefined,
  accent_color: form.accent_color || undefined,
  logo_url: form.logo_url || undefined,
  favicon_url: form.favicon_url || undefined,
  support_email: form.support_email || undefined,
  support_phone: form.support_phone || undefined,
  is_active: form.is_active,
});

export default function TenantsPage() {
  const { role } = useRole();
  const canManage = isRoleAllowed(role, ACTION_PERMISSIONS.manageTenants);

  const [tenants, setTenants] = useState<TenantDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [serviceOverrides, setServiceOverrides] = useState<TenantServiceOverride[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideBanner, setOverrideBanner] = useState<string | null>(null);
  const [overrideEditorOpen, setOverrideEditorOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState<OverrideFormState>(emptyOverrideForm);
  const [overrideEditorError, setOverrideEditorError] = useState<string | null>(null);
  const [overrideSaving, setOverrideSaving] = useState(false);

  const editingTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === editingId) ?? null,
    [tenants, editingId],
  );

  useEffect(() => {
    const fetchTenants = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await tenantsAPI.list(true);
        setTenants(response.data ?? []);
      } catch (err: any) {
        setError(err?.message ?? 'Unable to load tenants.');
      } finally {
        setLoading(false);
      }
    };

    void fetchTenants();
  }, []);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await servicesAPI.list(true);
        setServices(response.data ?? []);
      } catch {
        // ignore service errors for now
      }
    };

    void loadServices();
  }, []);

  useEffect(() => {
    if (!editingId) {
      setForm(emptyForm());
      return;
    }
    const tenant = tenants.find((item) => item.id === editingId);
    if (tenant) {
      setForm(toForm(tenant));
    }
  }, [editingId, tenants]);

  useEffect(() => {
    if (!editingId || creating) {
      setServiceOverrides([]);
      setOverrideBanner(null);
      setOverrideEditorOpen(false);
      return;
    }
    void loadOverrides(editingId);
  }, [editingId, creating]);

  const handleFieldChange = (field: keyof TenantForm, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getServiceLabel = (serviceId: string) =>
    services.find((service) => service.key === serviceId)?.label ?? serviceId;

  const resetOverrideEditor = () => {
    setOverrideForm({
      id: null,
      serviceId: services[0]?.key ?? '',
      status: 'active',
      overrideJson: '{\n  \n}',
    });
    setOverrideEditorError(null);
  };

  const handleStartOverrideCreate = () => {
    if (!editingId) return;
    setOverrideBanner(null);
    resetOverrideEditor();
    setOverrideEditorOpen(true);
  };

  const handleEditOverride = (override: TenantServiceOverride) => {
    setOverrideBanner(null);
    setOverrideEditorError(null);
    setOverrideForm({
      id: override.id,
      serviceId: override.serviceId,
      status: override.status ?? 'active',
      overrideJson: JSON.stringify(override.override ?? {}, null, 2),
    });
    setOverrideEditorOpen(true);
  };

  const handleOverrideFieldChange = (field: keyof OverrideFormState, value: string) => {
    setOverrideForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const loadOverrides = async (tenantId: string) => {
    setLoadingOverrides(true);
    setOverrideError(null);
    try {
      const response = await tenantsAPI.listServiceOverrides(tenantId);
      setServiceOverrides(response.data ?? []);
    } catch (err: any) {
      setOverrideError(err?.message ?? 'Unable to load overrides.');
    } finally {
      setLoadingOverrides(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString();
  };

  const handleSaveOverride = async () => {
    if (!editingId) return;
    if (!overrideForm.serviceId) {
      setOverrideEditorError('Select a service to override.');
      return;
    }

    let overridePayload: Record<string, any>;
    try {
      overridePayload = overrideForm.overrideJson.trim() ? JSON.parse(overrideForm.overrideJson) : {};
    } catch {
      setOverrideEditorError('Override JSON is invalid.');
      return;
    }

    setOverrideEditorError(null);
    setOverrideSaving(true);
    try {
      const payload: TenantServiceOverrideRequest = {
        override: overridePayload,
        status: overrideForm.status || undefined,
      };
      await tenantsAPI.upsertServiceOverride(editingId, overrideForm.serviceId, payload);
      setOverrideBanner('Override saved successfully.');
      setOverrideEditorOpen(false);
      resetOverrideEditor();
      await loadOverrides(editingId);
    } catch (err: any) {
      setOverrideEditorError(err?.message ?? 'Unable to save override.');
    } finally {
      setOverrideSaving(false);
    }
  };

  const handleCancelOverrideEdit = () => {
    setOverrideEditorOpen(false);
    resetOverrideEditor();
  };

  const resetFeedback = () => {
    setBanner(null);
    setError(null);
    setOverrideBanner(null);
    setOverrideEditorError(null);
  };

  const handleSelectTenant = (tenant: TenantDefinition) => {
    resetFeedback();
    setEditingId(tenant.id);
    setCreating(false);
    setOverrideEditorOpen(false);
    resetOverrideEditor();
  };

  const handleStartCreate = () => {
    resetFeedback();
    setCreating(true);
    setEditingId(null);
    setForm(emptyForm());
    setServiceOverrides([]);
    setOverrideEditorOpen(false);
    resetOverrideEditor();
  };

  const refreshTenants = async () => {
    try {
      const response = await tenantsAPI.list(true);
      setTenants(response.data ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to refresh tenants.');
    }
  };

  const handleSave = async () => {
    if (!canManage) return;
    setSaving(true);
    resetFeedback();
    try {
      if (creating) {
        const payload = createPayloadFromForm(form);
        await tenantsAPI.create(payload);
        setBanner('Tenant created successfully.');
        setCreating(false);
      } else if (editingTenant) {
        const payload = diffPayload(editingTenant, form);
        if (Object.keys(payload).length === 0) {
          setBanner('No changes to save.');
        } else {
          await tenantsAPI.update(editingTenant.id, payload);
          setBanner('Tenant updated successfully.');
        }
      }
      await refreshTenants();
      if (!creating && editingTenant) {
        await loadOverrides(editingTenant.id);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Unable to save tenant.');
    } finally {
      setSaving(false);
    }
  };

  const activeFormTitle = creating ? 'Create tenant' : editingTenant ? `Edit ${editingTenant.name}` : 'Select a tenant';

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            Manage white-label branding and partner configuration for each tenant instance.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
            onClick={handleStartCreate}
          >
            New tenant
          </button>
        )}
      </header>

      {banner && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {banner}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="rounded-lg border border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold text-muted-foreground">
            Tenants
          </div>
          <div className="max-h-[420px] divide-y divide-border/40 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center px-4 py-12 text-sm text-muted-foreground">
                Loading tenants…
              </div>
            ) : tenants.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">No tenants found.</div>
            ) : (
              tenants.map((tenant) => {
                const active = tenant.id === editingId;
                return (
                  <button
                    key={tenant.id}
                    type="button"
                    className={`w-full px-4 py-3 text-left text-sm transition ${
                      active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    }`}
                    onClick={() => handleSelectTenant(tenant)}
                  >
                    <div className="font-medium text-foreground">{tenant.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {tenant.slug} · {tenant.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{activeFormTitle}</h2>
            {!creating && editingTenant && (
              <span className={`text-xs font-medium ${editingTenant.is_active ? 'text-emerald-600' : 'text-slate-600'}`}>
                {editingTenant.is_active ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>

          {(creating || editingTenant) ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.name}
                    disabled={!canManage || saving}
                    onChange={(event) => handleFieldChange('name', event.target.value)}
                    placeholder="Tenant display name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Slug</label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.slug}
                    disabled={!canManage || saving}
                    onChange={(event) => handleFieldChange('slug', event.target.value)}
                    placeholder="lithium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.description}
                  disabled={!canManage || saving}
                  onChange={(event) => handleFieldChange('description', event.target.value)}
                  placeholder="Headline or overview shown in partner touchpoints"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {(['primary_color', 'secondary_color', 'accent_color'] as const).map((field) => (
                  <div key={field} className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {field.replace('_', ' ')}
                    </label>
                    <input
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={form[field]}
                      disabled={!canManage || saving}
                      onChange={(event) => handleFieldChange(field, event.target.value)}
                      placeholder="#0f172a"
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logo URL</label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.logo_url}
                    disabled={!canManage || saving}
                    onChange={(event) => handleFieldChange('logo_url', event.target.value)}
                    placeholder="https://cdn.example.com/logo.svg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Favicon URL</label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.favicon_url}
                    disabled={!canManage || saving}
                    onChange={(event) => handleFieldChange('favicon_url', event.target.value)}
                    placeholder="https://cdn.example.com/favicon.png"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Support email</label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.support_email}
                    disabled={!canManage || saving}
                    onChange={(event) => handleFieldChange('support_email', event.target.value)}
                    placeholder="support@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Support phone</label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.support_phone}
                    disabled={!canManage || saving}
                    onChange={(event) => handleFieldChange('support_phone', event.target.value)}
                    placeholder="+254700123456"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border/50 bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Tenant status</p>
                  <p className="text-xs text-muted-foreground">Inactive tenants will be hidden from partner experiences.</p>
                </div>
                <button
                  type="button"
                  className={`inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-semibold transition ${
                    form.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-600'
                  }`}
                  disabled={!canManage || saving}
                  onClick={() => handleFieldChange('is_active', !form.is_active)}
                >
                  {form.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>

              {!creating && editingTenant && (
                <section className="space-y-3 rounded-md border border-border/60 bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Service overrides</p>
                      <p className="text-xs text-muted-foreground">
                        Adjust per-tenant behaviour for underwriting and workflow configuration.
                      </p>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleStartOverrideCreate}
                        disabled={overrideSaving || loadingOverrides || services.length === 0}
                      >
                        Add override
                      </button>
                    )}
                  </div>

                  {overrideBanner && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      {overrideBanner}
                    </div>
                  )}

                  {overrideError && (
                    <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {overrideError}
                    </div>
                  )}

                  {loadingOverrides ? (
                    <div className="text-xs text-muted-foreground">Loading overrides…</div>
                  ) : serviceOverrides.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
                      No overrides configured yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {serviceOverrides.map((override) => (
                        <div
                          key={override.id}
                          className="rounded-md border border-border/60 bg-card/80 px-4 py-3 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{getServiceLabel(override.serviceId)}</p>
                              <p className="text-xs text-muted-foreground">
                                Status: {(override.status ?? 'active').toUpperCase()} · Updated {formatDate(override.updatedAt)}
                              </p>
                            </div>
                            {canManage && (
                              <button
                                type="button"
                                className="inline-flex items-center rounded-md border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
                                onClick={() => handleEditOverride(override)}
                              >
                                Edit
                              </button>
                            )}
                          </div>
                          <pre className="mt-2 max-h-36 overflow-auto rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                            {JSON.stringify(override.override ?? {}, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}

                  {overrideEditorOpen && (
                    <div className="space-y-3 rounded-md border border-border/60 bg-card/70 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Service
                          </label>
                          <select
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            value={overrideForm.serviceId}
                            disabled={overrideSaving}
                            onChange={(event) => handleOverrideFieldChange('serviceId', event.target.value)}
                          >
                            <option value="" disabled>
                              Select service
                            </option>
                            {services.map((service) => (
                              <option key={service.key} value={service.key}>
                                {service.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Status
                          </label>
                          <select
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            value={overrideForm.status}
                            disabled={overrideSaving}
                            onChange={(event) => handleOverrideFieldChange('status', event.target.value)}
                          >
                            {overrideStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Override JSON
                        </label>
                        <textarea
                          className="min-h-[160px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          value={overrideForm.overrideJson}
                          disabled={overrideSaving}
                          onChange={(event) => handleOverrideFieldChange('overrideJson', event.target.value)}
                        />
                      </div>
                      {overrideEditorError && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                          {overrideEditorError}
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={handleCancelOverrideEdit}
                          disabled={overrideSaving}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md border border-primary bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={handleSaveOverride}
                          disabled={overrideSaving}
                        >
                          {overrideSaving ? 'Saving…' : 'Save override'}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => {
                    setEditingId(null);
                    setCreating(false);
                    setForm(emptyForm());
                    resetFeedback();
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleSave}
                  disabled={!canManage || saving || (!creating && !editingTenant)}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border/50 bg-muted/10 px-6 py-12 text-center text-sm text-muted-foreground">
              Select a tenant to begin editing or create a new tenant profile.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
