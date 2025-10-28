import { expect, Page } from '@playwright/test';
import { SignJWT } from 'jose';

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@lithium.insure';
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'Admin@1234';
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'development-secret';
const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token';

type BackendLoginSuccess = {
  success?: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
    csrfToken: string;
    sessionId: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      twoFactorEnabled?: boolean;
    };
  };
  message?: string;
};

async function bootstrapSessionCookie(page: Page): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    const payload = (await response.json().catch(() => ({}))) as BackendLoginSuccess;
    if (!response.ok || !payload?.data) {
      console.error('playwright bootstrap login failed', response.status, payload?.message);
      return false;
    }

    const { data } = payload;
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + 60 * 60; // 1 hour session for tests

    const sessionToken = await new SignJWT({
      name: data.user.name,
      email: data.user.email,
      picture: null,
      sub: data.user.id,
      role: data.user.role,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      accessTokenExpires: Date.now() + data.expiresIn * 1000,
      refreshTokenExpires: Date.now() + data.refreshExpiresIn * 1000,
      csrfToken: data.csrfToken,
      sessionId: data.sessionId,
      twoFactorEnabled: Boolean(data.user.twoFactorEnabled),
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(new TextEncoder().encode(NEXTAUTH_SECRET));

    await page.context().addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        expires: expiresAt,
      },
    ]);

    // Optional helper cookies for client-side expectations
    await page.context().addCookies([
      {
        name: 'next-auth.callback-url',
        value: encodeURIComponent('http://localhost:3000'),
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        expires: issuedAt + 60 * 60,
      },
    ]);

    return true;
  } catch (error) {
    console.error('playwright bootstrap session error', error);
    return false;
  }
}

export async function loginAsAdmin(page: Page) {
  await ensureBackendHealthy();

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  if (page.url().includes('/login')) {
    const sessionAvailable = await bootstrapSessionCookie(page);
    if (!sessionAvailable) {
      throw new Error('Unable to bootstrap admin session for e2e test');
    }
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  }
  await expect(page.getByRole('heading', { name: 'Dashboard overview' })).toBeVisible();
}

export async function ensureBackendHealthy() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/workflows`);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // swallow and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Backend health check failed after multiple retries');
}
