import type { Request, Response } from 'express';
import type { User } from '@wisepath/domain/auth';

/**
 * The session: a signed token (JWT) naming the user, kept by the browser in
 * an httpOnly cookie. Other clients may send it as a Bearer token instead.
 * A browser's session is renewed as it is used, so a learner who comes back
 * within a month never logs in again (decided 2026-10-18, strategy G10).
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The session's user, set by JwtAuthGuard */
      user?: User;
    }
  }
}

const COOKIE = 'access_token';

/** How long a session lasts without being used */
export const SESSION_DAYS = 30;

/** A browser's session is renewed once it is this old, at most once a day rather than on every request */
export const RENEW_AFTER_SECONDS = 24 * 60 * 60;

/** What the token says */
export interface SessionClaims {
  readonly userId: string;
  readonly email: string;
}

export const claimsOf = (user: User): SessionClaims => ({ userId: user.id, email: user.email });

/** The token the request carries, from the Authorization header or the cookie, and which of the two */
export function tokenOf(req: Request): { readonly token: string; readonly from: 'bearer' | 'cookie' } | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return { token: header.slice('Bearer '.length), from: 'bearer' };

  const cookie: unknown = req.cookies?.[COOKIE];
  return typeof cookie === 'string' ? { token: cookie, from: 'cookie' } : null;
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE);
}
