import NextAuth, { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    error?: string;
    csrfToken?: string;
    sessionId?: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      twoFactorEnabled?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    refreshTokenExpires: number;
    csrfToken: string;
    sessionId: string;
    twoFactorEnabled?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    refreshTokenExpires?: number;
    role?: string;
    error?: string;
    userId?: string;
    email?: string;
    name?: string;
    csrfToken?: string;
    sessionId?: string;
    twoFactorEnabled?: boolean;
  }
}
