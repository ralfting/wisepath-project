import type { Request, Response } from 'express';
import type { User } from '@wisepath/domain/auth';

/**
 * The session: a signed token (JWT) naming the user, kept by the browser in
 * an httpOnly cookie. Other clients may send it as a Bearer token instead.
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

/** How long a session lasts */
export const SESSION_HOURS = 24;

/** What the token says */
export interface SessionClaims {
  readonly userId: string;
  readonly email: string;
}

export const claimsOf = (user: User): SessionClaims => ({ userId: user.id, email: user.email });

/** The token the request carries, from the Authorization header or the cookie */
export function tokenOf(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length);
  const cookie: unknown = req.cookies?.[COOKIE];
  return typeof cookie === 'string' ? cookie : null;
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE);
}
