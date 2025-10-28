'use client';

import { useEffect, useMemo, useState } from 'react';

import { aiSettingsAPI, tenantsAPI } from '@/lib/api';
import { ACTION_PERMISSIONS, isRoleAllowed } from '@/lib/permissions';
import { useRole } from '@/hooks/useRole';
import type { TenantAISettings, TenantDefinition } from '@/types/api';
import { WebChatWidget } from '@/components/ai/WebChatWidget';

type AISettingsDraft = {
  aiEnabled: boolean;
  provider: string;
  model: string;
  temperature: string;
  maxTokens: string;
  promptTemplate: string;
  toneGuidelines: string;
  toolWhitelist: string;
  autonomyLevel: string;
  metadata: string;
};

const toDraft = (settings: TenantAISettings): AISettingsDraft => ({
  aiEnabled: settings.aiEnabled,
  provider: settings.provider ?? '',
  model: settings.model ?? '',
  temperature: settings.temperature != null ? String(settings.temperature) : '0.2',
  maxTokens: settings.maxTokens != null ? String(settings.maxTokens) : '1024',
  promptTemplate: settings.promptTemplate ?? '',
  toneGuidelines: settings.toneGuidelines ?? '',
  toolWhitelist: (settings.toolWhitelist ?? []).join('\n'),
  autonomyLevel: String(settings.autonomyLevel ?? 0),
  metadata: JSON.stringify(settings.metadata ?? {}, null, 2),
});

export default function AISettingsPage() {
  const { role } = useRole();
  const canManage = isRoleAllowed(role, ACTION_PERMISSIONS.manageAI);

  const [tenants, setTenants] = useState<TenantDefinition[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [settings, setSettings] = useState<TenantAISettings | null>(null);
  const [draft, setDraft] = useState<AISettingsDraft | null>(null);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadTenants = useMemo(
    () =>
      async () => {
        setLoadingTenants(true);
        setError(null);
        try {
          const response = await tenantsAPI.list(false);
          const items = response.data ?? [];
          setTenants(items);
          if (items.length > 0) {
            setSelectedTenantId((prev) => prev || items[0].id);
          }
        } catch (err: any) {
          setError(err?.message ?? 'Unable to load tenants.');
        } finally {
          setLoadingTenants(false);
        }
      },
    [],
  );

  useEffect(() => {
    loadTenants().catch(() => {
      /* handled */
    });
  }, [loadTenants]);

  useEffect(() => {
    if (!selectedTenantId) {
      setSettings(null);
      setDraft(null);
      return;
    }

    const fetchSettings = async () => {
      setLoadingSettings(true);
      setError(null);
      try {
        const response = await aiSettingsAPI.get(selectedTenantId);
        const payload = response.data;
        if (payload) {
          setSettings(payload);
          setDraft(toDraft(payload));
        }
      } catch (err: any) {
        setError(err?.message ?? 'Unable to load AI settings.');
        setSettings(null);
        setDraft(null);
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings().catch(() => {
      /* handled */
    });
  }, [selectedTenantId]);

  const handleDraftUpdate = (field: keyof AISettingsDraft, value: string | boolean) => {
    setDraft((prev) => {
      if (!prev) return prev;
      if (typeof value === 'boolean') {
        return { ...prev, [field]: value } as AISettingsDraft;
      }
      return { ...prev, [field]: value } as AISettingsDraft;
    });
  };

  const handleSave = async () => {
    if (!canManage || !selectedTenantId || !draft) return;

    const cleanedProvider = draft.provider.trim() || null;
    const cleanedModel = draft.model.trim() || null;

    let temperatureValue: number | undefined;
    let maxTokensValue: number | undefined;
    let autonomyLevelValue: number | undefined;
    let metadataValue: Record<string, any> | undefined;
    const toolWhitelistValue: string[] = draft.toolWhitelist
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    setError(null);
    setNotice(null);

    if (draft.temperature.trim() !== '') {
      const parsed = Number(draft.temperature);
      if (Number.isNaN(parsed)) {
        setError('Enter a valid temperature.');
        return;
      }
      temperatureValue = parsed;
    }

    if (draft.maxTokens.trim() !== '') {
      const parsed = Number(draft.maxTokens);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        setError('Max tokens must be a positive integer.');
        return;
      }
      maxTokensValue = parsed;
    }

    if (draft.autonomyLevel.trim() !== '') {
      const parsed = Number(draft.autonomyLevel);
      if (!Number.isInteger(parsed) || parsed < 0) {
        setError('Autonomy level must be zero or a positive integer.');
        return;
      }
      autonomyLevelValue = parsed;
    }

    if (draft.metadata.trim() !== '') {
      try {
        metadataValue = JSON.parse(draft.metadata);
      } catch (jsonError: any) {
        setError(jsonError?.message ?? 'Metadata must be valid JSON.');
        return;
      }
    } else {
      metadataValue = {};
    }

    const payload = {
      aiEnabled: draft.aiEnabled,
      provider: cleanedProvider,
      model: cleanedModel,
      temperature: temperatureValue,
      maxTokens: maxTokensValue,
      promptTemplate: draft.promptTemplate || null,
      toneGuidelines: draft.toneGuidelines || null,
      toolWhitelist: toolWhitelistValue,
      autonomyLevel: autonomyLevelValue,
      metadata: metadataValue,
    };

    setSaving(true);
    try {
      const response = await aiSettingsAPI.update(selectedTenantId, payload);
      const next = response.data;
      if (next) {
        setSettings(next);
        setDraft(toDraft(next));
        setNotice('AI settings saved.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Unable to save AI settings.');
    } finally {
      setSaving(false);
    }
  };

  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">AI Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure agent providers, tone, and guardrails for each tenant. Settings remain inactive until the AI feature
          flag is enabled.
        </p>
      </header>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Tenant</label>
            <p className="text-xs text-muted-foreground">Select the tenant whose agent behaviour you want to adjust.</p>
          </div>
          <select
            className="w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedTenantId}
            onChange={(event) => {
              setSelectedTenantId(event.target.value);
            }}
            disabled={loadingTenants}
          >
            {tenants.length === 0 && <option value="">No tenants available</option>}
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>

        {!selectedTenant && !loadingTenants && (
          <p className="text-sm text-muted-foreground">Create a tenant to configure AI settings.</p>
        )}

        {selectedTenant && draft && (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">Enable autonomous agent</p>
                <p className="text-xs text-muted-foreground">
                  When disabled, the classic scripted flows remain the only channel responses.
                </p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={draft.aiEnabled}
                onChange={(event) => handleDraftUpdate('aiEnabled', event.target.checked)}
                disabled={!canManage}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Provider</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={draft.provider}
                  onChange={(event) => handleDraftUpdate('provider', event.target.value)}
                  placeholder="deepseek"
                  disabled={!canManage}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Model</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={draft.model}
                  onChange={(event) => handleDraftUpdate('model', event.target.value)}
                  placeholder="deepseek-chat"
                  disabled={!canManage}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Temperature</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={draft.temperature}
                  onChange={(event) => handleDraftUpdate('temperature', event.target.value)}
                  disabled={!canManage}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Max tokens</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={draft.maxTokens}
                  onChange={(event) => handleDraftUpdate('maxTokens', event.target.value)}
                  disabled={!canManage}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Tone guidelines</label>
              <textarea
                className="h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={draft.toneGuidelines}
                onChange={(event) => handleDraftUpdate('toneGuidelines', event.target.value)}
                placeholder="Warm, empathetic, friendly tone with clear disclaimers..."
                disabled={!canManage}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Prompt template</label>
              <textarea
                className="h-40 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={draft.promptTemplate}
                onChange={(event) => handleDraftUpdate('promptTemplate', event.target.value)}
                placeholder="System prompt for this tenant"
                disabled={!canManage}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Allowed tools</label>
                <textarea
                  className="h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={draft.toolWhitelist}
                  onChange={(event) => handleDraftUpdate('toolWhitelist', event.target.value)}
                  placeholder={`One tool per line, e.g.\nlist_services\ncreate_flow_session`}
                  disabled={!canManage}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Autonomy level</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={draft.autonomyLevel}
                  onChange={(event) => handleDraftUpdate('autonomyLevel', event.target.value)}
                  disabled={!canManage}
                />
                <p className="text-xs text-muted-foreground">
                  0 = Q&A only, 1 = tool suggestions, 2 = semi-autonomous, 3+ = limited autonomy.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Metadata (JSON)</label>
              <textarea
                className="h-40 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={draft.metadata}
                onChange={(event) => handleDraftUpdate('metadata', event.target.value)}
                placeholder={`{\n  "disclaimer": "Responses are informational only"\n}`}
                disabled={!canManage}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
                onClick={() => {
                  if (settings) {
                    setDraft(toDraft(settings));
                    setNotice('Changes reverted.');
                  }
                }}
                disabled={!canManage || saving}
              >
                Reset
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                onClick={() => handleSave()}
                disabled={!canManage || saving || loadingSettings}
              >
                {saving ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          </div>
        )}

        {loadingSettings && <p className="text-sm text-muted-foreground">Loading settings...</p>}
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold">Web chat preview</h2>
          <p className="text-xs text-muted-foreground">
            Send a sample question to see how the agent responds over the lightweight web chat channel. This uses the
            same /channels/webchat endpoint that you can embed in customer-facing widgets.
          </p>
        </header>
        <WebChatWidget tenantId={selectedTenant?.id} />
      </section>
    </div>
  );
}
