'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { NAV_ITEMS, ROUTE_GUARDS, isRoleAllowed } from '@/lib/permissions';
import { useRole } from '@/hooks/useRole';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, session, status } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [, startThemeTransition] = useTransition();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }
    const guard = ROUTE_GUARDS.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
    if (guard && !isRoleAllowed(role, guard.roles)) {
      router.replace('/unauthorized');
    }
  }, [status, pathname, role, router]);

  const allowedNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => isRoleAllowed(role, item.roles)),
    [role],
  );

  const toggleTheme = useCallback(() => {
    startThemeTransition(() => {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    });
  }, [resolvedTheme, setTheme, startThemeTransition]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950/80">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/45 border-t-primary" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white text-foreground dark:from-slate-950 dark:via-slate-950/95 dark:to-slate-900">
      <div className="hidden lg:flex">
        <Sidebar items={allowedNavItems} />
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} aria-hidden />
          <div className="relative h-full w-72">
            <Sidebar items={allowedNavItems} onToggle={() => setSidebarOpen(false)} onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar
          user={{ name: session?.user?.name ?? session?.user?.email, role }}
          onToggleSidebar={() => setSidebarOpen((value) => !value)}
          onToggleTheme={toggleTheme}
        />

        <main className="flex-1 px-4 pb-10 pt-6 md:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-background/40 px-6 py-10 text-sm shadow-[0_30px_120px_-60px_rgba(15,23,42,0.75)] backdrop-blur-xl sm:px-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_60%)]" aria-hidden />
              <div className="relative flex flex-wrap items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">Lithium observatory</p>
                  <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">Operational intelligence command centre</h1>
                  <p className="mt-3 max-w-2xl text-sm text-muted-foreground/80">
                    Monitor revenue, claims, automation, and tenant health with live data streams. Stay ahead with
                    AI-assisted diagnostics across the insurance lifecycle.
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 text-left sm:text-right">
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    Live sync enabled
                  </span>
                  <p className="text-xs text-muted-foreground/80">
                    Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </section>

            <div className="mt-10 space-y-8" aria-live="polite">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
