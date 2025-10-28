'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  useDistributionChannels,
  useCreateDistributionChannel,
  useUpdateDistributionChannel,
  useDeleteDistributionChannel,
  useLogDistributionSync,
} from '@/hooks/useDistributionChannels';
import { tenantsAPI } from '@/lib/api';
import type { DistributionChannel, TenantDefinition } from '@/types/api';

const ButtonClass =
  'inline-flex items-center justify-center rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60';

const OutlineButtonClass =
  'inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60';

const InputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const TextareaClass =
  'min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const STATUS_OPTIONS = ['active', 'inactive', 'paused', 'error'] as const;

type ChannelFormState = {
  name: string;
  channelType: string;
  tenantId: string;
  status: string;
  configJson: string;
};

const emptyForm = (): ChannelFormState => ({
  name: '',
  channelType: '',
  tenantId: '',
  status: 'active',
  configJson: '{\n  \n}',
});

export default function DistributionChannelsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<ChannelFormState>(emptyForm);
  const [syncStatus, setSyncStatus] = useState('ok');
  const [syncMessage, setSyncMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const tenantsQuery = useQuery<TenantDefinition[]>(['tenants', 'all'], async () => {
    const response = await tenantsAPI.list(true);
    return response.data ?? [];
  });

  const channelsQuery = useDistributionChannels();
  const createMutation = useCreateDistributionChannel();
  const updateMutation = useUpdateDistributionChannel();
  const deleteMutation = useDeleteDistributionChannel();
  const syncMutation = useLogDistributionSync();

  const channels = channelsQuery.data ?? [];
  const selectedChannel = useMemo<DistributionChannel | null>(() => {
    if (!channels.length) return null;
    if (selectedId) {
      return channels.find((item) => item.id === selectedId) ?? null;
    }
    return showCreate ? null : channels[0];
  }, [channels, selectedId, showCreate]);

  useEffect(() => {
    if (!selectedChannel || showCreate) {
      setForm(emptyForm());
      return;
    }
    setForm({
      name: selectedChannel.name,
      channelType: selectedChannel.channelType,
      tenantId: selectedChannel.tenantId ?? '',
      status: selectedChannel.status ?? 'active',
      configJson: JSON.stringify(selectedChannel.config ?? {}, null, 2),
    });
  }, [selectedChannel?.id, showCreate]);

  const tenants = tenantsQuery.data ?? [];
  const loading = channelsQuery.isLoading;

  const handleSelect = (channel: DistributionChannel) => {
    setSelectedId(channel.id);
    setShowCreate(false);
    setFormError(null);
  };

  const parseConfig = () => {
    if (!form.configJson.trim()) {
      return {};
    }
    try {
      return JSON.parse(form.configJson);
    } catch (error) {
      setFormError('Configuration JSON is invalid.');
      throw error;
    }
  };

  const handleCreate = async () => {
    try {
      setFormError(null);
      const payload = {
        name: form.name.trim(),
        channelType: form.channelType.trim(),
        tenantId: form.tenantId || undefined,
        status: form.status || undefined,
        config: parseConfig(),
      };
      if (!payload.name || !payload.channelType) {
        setFormError('Name and channel type are required.');
        return;
      }
      const response = await createMutation.mutateAsync(payload);
      if (response?.id) {
        setSelectedId(response.id);
        setShowCreate(false);
      }
      setForm(emptyForm());
    } catch (error) {
      if (error instanceof SyntaxError) {
        return;
      }
      setFormError((error as Error)?.message || 'Unable to create channel.');
    }
  };

  const handleUpdate = async () => {
    if (!selectedChannel) return;
    try {
      setFormError(null);
      const payload = {
        name: form.name.trim() || undefined,
        channelType: form.channelType.trim() || undefined,
        tenantId: form.tenantId || null,
        status: form.status || undefined,
        config: parseConfig(),
      };
      await updateMutation.mutateAsync({ channelId: selectedChannel.id, payload });
    } catch (error) {
      if (error instanceof SyntaxError) {
        return;
      }
      setFormError((error as Error)?.message || 'Unable to update channel.');
    }
  };

  const handleDelete = async () => {
    if (!selectedChannel) return;
    await deleteMutation.mutateAsync(selectedChannel.id);
    setSelectedId(null);
  };

  const handleSync = async () => {
    if (!selectedChannel) return;
    await syncMutation.mutateAsync({
      channelId: selectedChannel.id,
      payload: {
        status: syncStatus,
        message: syncMessage || undefined,
      },
    });
    setSyncMessage('');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Distribution channels</h1>
          <p className="text-sm text-muted-foreground">
            Manage downstream distribution endpoints, webhook destinations, and integrations.
          </p>
        </div>
        <button
          type="button"
          className={ButtonClass}
          onClick={() => {
            setShowCreate((prev) => !prev);
            setForm(emptyForm());
            setFormError(null);
            if (!showCreate) {
              setSelectedId(null);
            }
          }}
        >
          {showCreate ? 'Close form' : 'New channel'}
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="rounded-lg border border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold text-muted-foreground">
            Channels
          </div>
          <div className="max-h-[520px] divide-y divide-border/40 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center px-4 py-12 text-sm text-muted-foreground">
                Loading channels...
              </div>
            ) : channels.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">No channels configured.</div>
            ) : (
              channels.map((channel) => {
                const active = selectedChannel?.id === channel.id && !showCreate;
                return (
                  <button
                    key={channel.id}
                    type="button"
                    className={`w-full px-4 py-3 text-left text-sm transition ${
                      active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    }`}
                    onClick={() => handleSelect(channel)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{channel.name}</span>
                      <span className="text-xs text-muted-foreground">{channel.channelType}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Status: {channel.status || 'unknown'}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="space-y-4 rounded-lg border border-border/60 bg-card p-6 shadow-sm">
          {showCreate ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Create distribution channel</h2>
                <p className="text-sm text-muted-foreground">Define where policy events and leads should be delivered.</p>
              </div>
              <FormFields
                form={form}
                tenants={tenants}
                setForm={setForm}
                disabled={createMutation.isLoading}
              />
              {formError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={OutlineButtonClass}
                  onClick={() => setShowCreate(false)}
                  disabled={createMutation.isLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={ButtonClass}
                  onClick={handleCreate}
                  disabled={createMutation.isLoading}
                >
                  {createMutation.isLoading ? 'Creating...' : 'Create channel'}
                </button>
              </div>
            </div>
          ) : selectedChannel ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{selectedChannel.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedChannel.channelType}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`${OutlineButtonClass} border-destructive text-destructive`}
                    onClick={handleDelete}
                    disabled={deleteMutation.isLoading}
                  >
                    {deleteMutation.isLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                  <div className="font-semibold text-foreground">Status</div>
                  <div className="mt-1 text-sm text-foreground">{selectedChannel.status || 'unknown'}</div>
                  <div className="mt-2">Last sync: {selectedChannel.lastSyncedAt ?? '--'}</div>
                  <div>Sync status: {selectedChannel.lastSyncStatus ?? '--'}</div>
                  {selectedChannel.lastSyncMessage && <div>Message: {selectedChannel.lastSyncMessage}</div>}
                </div>
                <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                  <div className="font-semibold text-foreground">Metadata</div>
                  <div className="mt-1">Tenant: {selectedChannel.tenantId ?? 'Global'}</div>
                  <div>Created: {selectedChannel.createdAt ?? '--'}</div>
                  <div>Updated: {selectedChannel.updatedAt ?? '--'}</div>
                </div>
              </div>

              <FormFields
                form={form}
                tenants={tenants}
                setForm={setForm}
                disabled={updateMutation.isLoading}
              />

              {formError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  className={ButtonClass}
                  onClick={handleUpdate}
                  disabled={updateMutation.isLoading}
                >
                  {updateMutation.isLoading ? 'Saving...' : 'Save changes'}
                </button>
              </div>

              <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Log sync event</h3>
                  <p className="text-xs text-muted-foreground">
                    Record the outcome of external sync attempts for auditing and analytics.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-wide text-muted-foreground">Status</label>
                    <select
                      className={InputClass}
                      value={syncStatus}
                      onChange={(event) => setSyncStatus(event.target.value)}
                    >
                      {['ok', 'warning', 'error'].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-wide text-muted-foreground">Message</label>
                    <input
                      className={InputClass}
                      value={syncMessage}
                      onChange={(event) => setSyncMessage(event.target.value)}
                      placeholder="Optional description"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className={OutlineButtonClass}
                    onClick={handleSync}
                    disabled={syncMutation.isLoading}
                  >
                    {syncMutation.isLoading ? 'Logging...' : 'Log sync'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Configuration</h3>
                <pre className="max-h-64 overflow-auto rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                  {JSON.stringify(selectedChannel.config ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a channel or create a new one to get started.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type FormFieldsProps = {
  form: ChannelFormState;
  tenants: TenantDefinition[];
  setForm: Dispatch<SetStateAction<ChannelFormState>>;
  disabled?: boolean;
};

function FormFields({ form, tenants, setForm, disabled }: FormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</label>
          <input
            className={InputClass}
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="CRM Webhook"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channel type</label>
          <input
            className={InputClass}
            value={form.channelType}
            onChange={(event) => setForm((prev) => ({ ...prev, channelType: event.target.value }))}
            placeholder="webhook | crm | marketplace"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tenant</label>
          <select
            className={InputClass}
            value={form.tenantId}
            onChange={(event) => setForm((prev) => ({ ...prev, tenantId: event.target.value }))}
            disabled={disabled}
          >
            <option value="">Global</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</label>
          <select
            className={InputClass}
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            disabled={disabled}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Configuration JSON
        </label>
        <textarea
          className={TextareaClass}
          value={form.configJson}
          onChange={(event) => setForm((prev) => ({ ...prev, configJson: event.target.value }))}
          disabled={disabled}
          placeholder={`{\n  "endpoint": "https://...",\n  "auth": {\n    "token": "..."\n  }\n}`}
        />
      </div>
    </div>
  );
}
