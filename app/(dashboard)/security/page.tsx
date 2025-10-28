'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

import {
  useTwoFactorSetup,
  useTwoFactorEnable,
  useTwoFactorDisable,
  useSessions,
  useRevokeSession,
} from '@/hooks/useSecurity';
import type { AdminSession, TwoFactorSetup } from '@/types/api';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function SecurityPage() {
  const { data: session, update } = useSession();
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null);
  const [enableCode, setEnableCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setupMutation = useTwoFactorSetup();
  const enableMutation = useTwoFactorEnable();
  const disableMutation = useTwoFactorDisable();
  const sessionsQuery = useSessions();
  const revokeMutation = useRevokeSession();

  const twoFactorEnabled = Boolean(
    session?.user && typeof (session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled === 'boolean'
      ? (session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled
      : false,
  );
  const activeSessionId = session && 'sessionId' in session ? (session as { sessionId?: string }).sessionId : undefined;

  const sortedSessions = useMemo<AdminSession[]>(() => {
    return [...(sessionsQuery.data ?? [])].sort((a, b) => {
      const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [sessionsQuery.data]);

  const handleGenerateSetup = async () => {
    setError(null);
    setMessage(null);
    try {
      const data = await setupMutation.mutateAsync();
      setSetupData(data);
      setMessage('Scan the QR code or enter the secret in your authenticator app, then verify below.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start two-factor setup.');
    }
  };

  const handleEnable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await enableMutation.mutateAsync(enableCode.trim());
      setSetupData(null);
      setEnableCode('');
      setMessage('Two-factor authentication enabled.');
      await update?.({
        ...session,
        user: { ...session?.user, twoFactorEnabled: true },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code.');
    }
  };

  const handleDisable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await disableMutation.mutateAsync(disableCode.trim());
      setDisableCode('');
      setMessage('Two-factor authentication disabled.');
      await update?.({
        ...session,
        user: { ...session?.user, twoFactorEnabled: false },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to disable two-factor authentication.');
    }
  };

  const handleRevokeSession = async (targetId: string) => {
    setError(null);
    setMessage(null);
    try {
      await revokeMutation.mutateAsync({ sessionId: targetId });
      setMessage('Session revoked.');
      if (targetId === activeSessionId) {
        await update?.({ ...session, sessionId: undefined });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to revoke session.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage authentication security, two-factor setup, and active admin sessions.
        </p>
      </div>

      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message ? 'border-emerald-600/30 bg-emerald-100/10 text-emerald-200' : 'border-rose-500/30 bg-rose-100/10 text-rose-200'
          }`}
        >
          {message ?? error}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Two-factor authentication</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Protect your admin account with a secondary verification step using an authenticator app.
            </p>
            <p className="mt-2 inline-block rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status: {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="space-y-4 rounded-lg border border-border/50 bg-background/40 p-4 text-sm">
            {!twoFactorEnabled && (
              <button
                type="button"
                onClick={handleGenerateSetup}
                disabled={setupMutation.isPending}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {setupMutation.isPending ? 'Generating…' : 'Generate setup code'}
              </button>
            )}

            {setupData && !twoFactorEnabled && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Secret key</p>
                  <code className="mt-1 inline-block rounded bg-muted px-2 py-1 text-xs">
                    {setupData.secret}
                  </code>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Provisioning URI</p>
                  <textarea
                    readOnly
                    value={setupData.otpauthUri}
                    className="mt-1 w-full resize-none rounded-md border border-border bg-background/60 p-2 text-xs text-foreground"
                    rows={3}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Scan this using Google Authenticator, Microsoft Authenticator, or a compatible app.
                  </p>
                </div>
                <form onSubmit={handleEnable} className="space-y-2">
                  <label htmlFor="enable-code" className="block text-xs font-medium text-muted-foreground">
                    Enter the 6-digit code to verify
                  </label>
                  <input
                    id="enable-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    value={enableCode}
                    onChange={(event) => setEnableCode(event.target.value)}
                    className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="submit"
                    disabled={enableMutation.isPending}
                    className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {enableMutation.isPending ? 'Verifying…' : 'Enable two-factor'}
                  </button>
                </form>
              </div>
            )}

            {twoFactorEnabled && (
              <form onSubmit={handleDisable} className="space-y-2">
                <label htmlFor="disable-code" className="block text-xs font-medium text-muted-foreground">
                  Enter a current authenticator code to disable
                </label>
                <input
                  id="disable-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={disableCode}
                  onChange={(event) => setDisableCode(event.target.value)}
                  className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="submit"
                  disabled={disableMutation.isPending}
                  className="inline-flex items-center justify-center rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {disableMutation.isPending ? 'Disabling…' : 'Disable two-factor'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Active sessions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review recent logins and revoke sessions you do not recognize.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Session</th>
                <th className="px-3 py-2 text-left">IP address</th>
                <th className="px-3 py-2 text-left">User agent</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">Last seen</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sessionsQuery.isLoading && (
                <tr>
                  <td className="px-3 py-4 text-center text-muted-foreground" colSpan={7}>
                    Loading sessions…
                  </td>
                </tr>
              )}

              {!sessionsQuery.isLoading && !sortedSessions.length && (
                <tr>
                  <td className="px-3 py-4 text-center text-muted-foreground" colSpan={7}>
                    No sessions found.
                  </td>
                </tr>
              )}

              {sortedSessions.map((item) => {
                const isCurrent = item.id === activeSessionId;
                return (
                  <tr key={item.id} className={isCurrent ? 'bg-primary/5' : undefined}>
                    <td className="px-3 py-3 font-mono text-xs text-foreground">
                      {item.id.slice(0, 8)}…
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{item.ipAddress ?? 'Unknown'}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <span className="line-clamp-2 max-w-xs text-xs">{item.userAgent ?? '—'}</span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDate(item.createdAt)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDate(item.lastSeenAt)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          item.active ? 'bg-emerald-500/20 text-emerald-200' : 'bg-border/40 text-muted-foreground'
                        }`}
                      >
                        {item.active ? (isCurrent ? 'Current session' : 'Active') : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(item.id)}
                        disabled={!item.active || isCurrent || revokeMutation.isPending}
                        className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground transition hover:bg-border/40 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
