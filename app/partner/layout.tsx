'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import { partnerAPI } from '@/lib/api';
import { isRoleAllowed } from '@/lib/permissions';
import { useRole } from '@/hooks/useRole';
import type { TenantDefinition } from '@/types/api';

const NAV_LINKS = [
  { href: '/partner/dashboard', label: 'Dashboard' },
  { href: '/partner/packages', label: 'Packages' },
  { href: '/partner/services', label: 'Services' },
  { href: '/partner/onboarding', label: 'Onboarding' },
  { href: '/partner/notifications', label: 'Notifications' },
] as const;

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { status, role } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const [tenant, setTenant] = useState<TenantDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!isRoleAllowed(role, ['partner', 'agent', 'admin'])) {
      router.replace('/unauthorized');
      return;
    }
    const fetchTenant = async () => {
      setLoading(true);
      try {
        const response = await partnerAPI.getTenant();
        setTenant(response.data ?? null);
      } catch (err: any) {
        setError(err?.message ?? 'Unable to load tenant branding.');
      } finally {
        setLoading(false);
      }
    };
    void fetchTenant();
  }, [status, role, router]);

  const activeLink = useMemo(
    () => NAV_LINKS.find((item) => pathname.startsWith(item.href))?.href ?? NAV_LINKS[0].href,
    [pathname],
  );

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  const brandBarStyle = tenant?.accent_color ? { backgroundColor: tenant.accent_color } : undefined;
  const primaryText = tenant?.primary_color ? { color: tenant.primary_color } : undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-foreground" style={primaryText}>
              {tenant?.name ?? 'Partner Portal'}
            </span>
            {tenant?.support_email && (
              <span className="text-xs text-muted-foreground">Support: {tenant.support_email}</span>
            )}
          </div>
          <nav className="flex gap-3 text-sm font-medium">
            {NAV_LINKS.map((link) => {
              const active = activeLink === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 transition ${
                    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="h-1 w-full" style={brandBarStyle} />
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">{children}</main>
    </div>
  );
}
