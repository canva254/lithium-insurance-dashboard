'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requiresOtp, setRequiresOtp] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        otp: requiresOtp ? otp : undefined,
      });

      console.log('login page signIn result', result);

      if (result?.error) {
        if (result.error === 'two_factor_required') {
          setRequiresOtp(true);
          setError('Enter the 2FA code from your authenticator app.');
          return;
        }
        setError(result.error ?? 'Unable to sign in. Please check your credentials.');
        return;
      }

      if (result?.ok) {
        router.replace('/dashboard');
        return;
      }

      setError('Unable to sign in. Please check your credentials.');
    } catch (err) {
      console.error('login page signIn failed', err);
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please check your credentials.');
      if (err instanceof Error && err.message === 'two_factor_required') {
        setRequiresOtp(true);
        setError('Enter the 2FA code from your authenticator app.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-sm text-white/60">Preparing your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-white">Insurance Admin</h1>
          <p className="mt-2 text-sm text-white/60">Sign in to manage policies, vendors, and analytics.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            {error}
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
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-white/80">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {requiresOtp && (
            <div className="space-y-2">
              <label htmlFor="otp" className="block text-sm font-medium text-white/80">
                Two-factor code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-white/50">Enter the 6-digit code from your authenticator app.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : requiresOtp ? 'Verify & sign in' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-white/50">
          <p className="mb-2">
            <Link href="/password-reset/request" className="text-primary hover:underline">
              Forgot your password?
            </Link>
          </p>
          <p>Contact the platform administrator if you need access.</p>
          <p className="mt-2">
            <Link href="/unauthorized" className="text-primary hover:underline">
              Need help?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
