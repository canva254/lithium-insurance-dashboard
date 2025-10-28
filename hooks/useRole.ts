'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';

import { normalizeRole, type UserRole } from '@/lib/permissions';

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

export const useRole = (): {
  role: UserRole;
  status: ReturnType<typeof useSession>['status'];
  session: ReturnType<typeof useSession>['data'];
} => {
  const session = useSession();

  const fallbackSession = useMemo(() => {
    if (!BYPASS_AUTH) {
      return null;
    }
    return {
      user: {
        id: 'test-admin',
        email: process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@lithium.insure',
        name: 'Playwright Admin',
        role: 'admin',
      },
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    } as ReturnType<typeof useSession>['data'];
  }, []);

  if (fallbackSession) {
    return {
      role: 'admin',
      status: 'authenticated',
      session: fallbackSession,
    };
  }

  const role = normalizeRole((session.data?.user as { role?: string } | undefined)?.role);

  return {
    role,
    status: session.status,
    session: session.data,
  };
};
