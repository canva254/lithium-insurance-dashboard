import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ROUTE_GUARDS, isRoleAllowed, normalizeRole } from './lib/permissions';

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || 'development-secret';
const BYPASS_AUTH = process.env.PLAYWRIGHT_BYPASS_AUTH === 'true';

export async function middleware(request: NextRequest) {
  if (BYPASS_AUTH) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const guard = ROUTE_GUARDS.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));

  if (!guard) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: AUTH_SECRET, raw: false });
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const role = normalizeRole(typeof token.role === 'string' ? token.role : undefined);
  if (!isRoleAllowed(role, guard.roles)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analytics/:path*',
    '/services/:path*',
    '/tenants/:path*',
    '/packages/:path*',
    '/vendors/:path*',
    '/pricing/:path*',
    '/workflows/:path*',
    '/security/:path*',
    '/partner/:path*',
  ],
};
