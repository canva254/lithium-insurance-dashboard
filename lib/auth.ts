import type { NextAuthOptions, Session } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { JWT } from 'next-auth/jwt';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const NEXTAUTH_DEBUG = process.env.NEXTAUTH_DEBUG === 'true';

type BackendLoginResponse = {
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
  detail?: unknown;
};

type BackendRefreshResponse = {
  success?: boolean;
  data?: {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    refreshExpiresIn?: number;
    csrfToken?: string;
    sessionId?: string;
  };
  message?: string;
};

type ExtendedSession = Session & {
  accessToken?: string;
  error?: string;
  csrfToken?: string;
  sessionId?: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    twoFactorEnabled?: boolean;
  };
};

async function loginWithCredentials(email: string, password: string, otp?: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, otp }),
    });

    console.log('nextauth loginWithCredentials response', response.status, response.statusText);
    const payload = (await response.json().catch(() => ({}))) as BackendLoginResponse;
    console.log('nextauth loginWithCredentials payload', payload);
    if (!response.ok || !payload?.data) {
      const detail = typeof payload?.detail === 'string' ? payload.detail : (payload?.detail as { code?: string })?.code;
      if (detail === 'two_factor_required') {
        throw new Error('two_factor_required');
      }
      throw new Error((payload?.message as string | undefined) ?? detail ?? 'Invalid credentials');
    }

    const { accessToken, refreshToken, expiresIn, refreshExpiresIn, csrfToken, sessionId, user } = payload.data;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken,
      accessTokenExpires: Date.now() + expiresIn * 1000,
      refreshTokenExpires: Date.now() + refreshExpiresIn * 1000,
      csrfToken,
      sessionId,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
    };
  } catch (error) {
    console.error('nextauth loginWithCredentials error', error);
    throw error;
  }
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    return { ...token, error: 'MissingRefreshToken' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });

    const payload = (await response.json().catch(() => ({}))) as BackendRefreshResponse;
    if (!response.ok || !payload?.data) {
      throw new Error(payload?.message ?? 'Unable to refresh token');
    }

    const { accessToken, refreshToken, expiresIn, refreshExpiresIn } = payload.data;

    return {
      ...token,
      accessToken,
      accessTokenExpires: Date.now() + expiresIn * 1000,
      refreshToken: refreshToken ?? token.refreshToken,
      refreshTokenExpires:
        refreshExpiresIn != null
          ? Date.now() + refreshExpiresIn * 1000
          : token.refreshTokenExpires,
      csrfToken: payload.data.csrfToken ?? token.csrfToken,
      sessionId: payload.data.sessionId ?? token.sessionId,
      error: undefined,
    };
  } catch (error) {
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

async function revokeRefreshToken(refreshToken?: string, accessToken?: string, csrfToken?: string) {
  if (!refreshToken || !accessToken) return;
  try {
    await fetch(`${API_BASE_URL}/admin/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    // Swallow errors: best effort logout.
  }
}

export const authOptions: NextAuthOptions & { trustHost?: boolean } = {
  debug: NEXTAUTH_DEBUG,
  logger: {
    error(code, metadata) {
      console.error('nextauth logger error', code, metadata);
    },
    warn(code) {
      if (NEXTAUTH_DEBUG) {
        console.warn('nextauth logger warn', code);
      }
    },
    debug(code, metadata) {
      if (NEXTAUTH_DEBUG) {
        console.log('nextauth logger debug', code, metadata);
      }
    },
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        otp: { label: 'One-time code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error('Email and password are required');
        }

        try {
          console.error('nextauth:authorize start', { email: credentials.email });
          const user = await loginWithCredentials(credentials.email, credentials.password, credentials.otp);
          console.error('nextauth:authorize success', { email: user.email });
          return user;
        } catch (error) {
          console.error('nextauth:authorize error', error);
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      console.log('nextauth:jwt callback', {
        hasUser: Boolean(user),
        tokenUser: token?.email,
        tokenAccess: Boolean(token?.accessToken),
      });
      if (user) {
        const enhancedUser = user as typeof user & {
          accessToken?: string;
          refreshToken?: string;
          accessTokenExpires?: number;
          refreshTokenExpires?: number;
          role?: string;
          csrfToken?: string;
          sessionId?: string;
          twoFactorEnabled?: boolean;
        };
        token.accessToken = enhancedUser.accessToken;
        token.refreshToken = enhancedUser.refreshToken;
        token.accessTokenExpires = enhancedUser.accessTokenExpires;
        token.refreshTokenExpires = enhancedUser.refreshTokenExpires;
        token.role = enhancedUser.role;
        token.name = enhancedUser.name;
        token.email = enhancedUser.email;
        token.userId = enhancedUser.id;
        token.csrfToken = enhancedUser.csrfToken;
        token.sessionId = enhancedUser.sessionId;
        token.twoFactorEnabled = enhancedUser.twoFactorEnabled;
        token.error = undefined;
        return token;
      }

      const accessTokenExpires = Number(token.accessTokenExpires ?? 0);
      const shouldRefresh = Date.now() >= accessTokenExpires - 30_000;
      console.log('nextauth:jwt evaluate', {
        accessTokenExpires,
        now: Date.now(),
        shouldRefresh,
      });
      if (!shouldRefresh) {
        return token;
      }

      console.log('nextauth:jwt refreshing');
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      console.log('nextauth:session callback', {
        hasToken: Boolean(token),
        tokenEmail: token?.email,
        tokenAccess: Boolean(token?.accessToken),
        sessionUser: session?.user,
      });
      const sessionWithExtensions = session as ExtendedSession;
      if (token?.error) {
        sessionWithExtensions.error = token.error as string | undefined;
      }
      sessionWithExtensions.accessToken = token.accessToken as string | undefined;
      sessionWithExtensions.csrfToken = token.csrfToken as string | undefined;
      sessionWithExtensions.sessionId = token.sessionId as string | undefined;
      sessionWithExtensions.user = {
        ...sessionWithExtensions.user,
        id: (token.userId as string) ?? sessionWithExtensions.user?.id ?? '',
        email: (token.email as string) ?? sessionWithExtensions.user?.email ?? '',
        name: (token.name as string) ?? sessionWithExtensions.user?.name ?? '',
        role: (token.role as string) ?? sessionWithExtensions.user?.role ?? 'admin',
        twoFactorEnabled: token.twoFactorEnabled as boolean | undefined,
      };
      return sessionWithExtensions;
    },
  },
  events: {
    async signOut({ token }) {
      await revokeRefreshToken(
        token?.refreshToken as string | undefined,
        token?.accessToken as string | undefined,
        token?.csrfToken as string | undefined,
      );
    },
    async signIn(message) {
      console.log('nextauth event signIn', message);
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-secret',
  trustHost: true,
};

console.log('authOptions providers snapshot', authOptions.providers);
