'use client';

import { useState } from 'react';
import Link from 'next/link';

import { authAPI } from '@/lib/api';

export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [developerToken, setDeveloperToken] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDeveloperToken(null);
    setSubmitting(true);

    try {
      const response = await authAPI.requestPasswordReset({ email });
      setSuccessMessage(
        response.message ?? 'If the account exists, a password reset link has been sent to the provided email.',
      );
      if (response.data?.token) {
        setDeveloperToken(response.data.token);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Unable to process password reset request at this time.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-white">Reset your password</h1>
          <p className="mt-2 text-sm text-white/60">
            Enter the email associated with your account and we&apos;ll send you instructions.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {successMessage}
            {developerToken && (
              <p className="mt-2 break-all text-xs text-emerald-100">
                Development reset token: <span className="font-mono">{developerToken}</span>
              </p>
            )}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-white/80">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Sending instructions…' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-white/50">
          <p>
            <Link href="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
