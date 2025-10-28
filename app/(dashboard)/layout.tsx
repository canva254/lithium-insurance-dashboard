'use client';

import { Menu, LogOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

import { NAV_ITEMS, ROUTE_GUARDS, isRoleAllowed } from '@/lib/permissions';
import { useRole } from '@/hooks/useRole';
import { packagesAPI, policiesAPI, servicesAPI, vendorsAPI } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, session, status } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const queryClient = useQueryClient();

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

  const prefetchRouteData = useCallback(
    (href: string) => {
      if (!href) {
        return;
      }

      if (href.startsWith('/services')) {
        void queryClient.prefetchQuery({
          queryKey: ['services', { includeDisabled: true }],
          queryFn: async () => {
            const response = await servicesAPI.list(true);
            return response.data ?? [];
          },
        });
        return;
      }

      if (href.startsWith('/packages')) {
        void queryClient.prefetchQuery({
          queryKey: ['packages', { sortBy: 'created_at', sortOrder: 'desc' }],
          queryFn: async () => {
            const response = await packagesAPI.getAll({ sortBy: 'created_at', sortOrder: 'desc' });
            return response.data ?? [];
          },
        });
        void queryClient.prefetchQuery({
          queryKey: ['vendors'],
          queryFn: async () => {
            const response = await vendorsAPI.getAll();
            return response.data ?? [];
          },
        });
        return;
      }

      if (href.startsWith('/policies')) {
        void queryClient.prefetchQuery({
          queryKey: ['policies', { page: 1, pageSize: 25 }],
          queryFn: async () => {
            const response = await policiesAPI.list({ page: 1, pageSize: 25 });
            return response.data;
          },
        });
      }
    },
    [queryClient],
  );

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card/90 p-6 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-semibold">Insurance Admin</span>
          <button
            className="rounded-md border border-border/40 px-2 py-1 text-xs text-muted-foreground hover:bg-muted lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            Close
          </button>
        </div>
        <nav className="mt-8 space-y-2">
          {allowedNavItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                }`}
                onMouseEnter={() => prefetchRouteData(item.href)}
                onFocus={() => prefetchRouteData(item.href)}
                onClick={() => setSidebarOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col lg:ml-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-2 py-1 text-sm text-muted-foreground hover:bg-muted lg:hidden"
              onClick={() => setSidebarOpen((value) => !value)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="hidden text-sm text-muted-foreground lg:inline">Welcome back</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden flex-col text-right text-xs text-muted-foreground sm:flex">
              <span className="font-medium text-foreground">{session?.user?.name}</span>
              <span className="capitalize">{role}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 bg-muted/10 px-4 py-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
