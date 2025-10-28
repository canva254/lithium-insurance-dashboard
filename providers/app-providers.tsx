'use client';

import { ReactNode, useMemo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';

import { queryClient } from '@/lib/query-client';

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

export function AppProviders({ children }: { children: ReactNode }) {
  const bypassSession = useMemo(() => {
    if (!BYPASS_AUTH) {
      return undefined;
    }
    return {
      user: {
        id: 'test-admin',
        email: 'admin@lithium.insure',
        name: 'Playwright Admin',
        role: 'admin',
      },
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }, []);

  return (
    <SessionProvider
      session={bypassSession}
      refetchInterval={BYPASS_AUTH ? 0 : undefined}
      refetchOnWindowFocus={!BYPASS_AUTH}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        {typeof window !== 'undefined' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </SessionProvider>
  );
}
