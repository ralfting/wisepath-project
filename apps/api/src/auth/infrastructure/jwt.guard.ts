import { HttpException, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { Option, Schema } from 'effect';
import { NotAuthenticated, UserId } from '@wisepath/domain/auth';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { sessionUser } from '../application/auth';
import { RENEW_AFTER_SECONDS, claimsOf, setSessionCookie, tokenOf } from './session';
import type { SessionClaims } from './session';

/** What a request without a valid session is answered with, as the contract describes */
const notAuthenticated = () => new HttpException(Schema.encodeSync(NotAuthenticated)(new NotAuthenticated()), 401);

/**
 * JwtAuthGuard
 * Lets a request through when it carries a valid, unexpired session token
 * whose account still exists, and puts that user on the request. A browser
 * session older than a day gets a fresh cookie, so using the app keeps it.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly effect: EffectRuntime,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const session = await this.sessionOf(req);
    if (!session) throw notAuthenticated();

    req.user = session.user;
    const age = Date.now() / 1000 - (session.claims.iat ?? 0);
    if (session.from === 'cookie' && age > RENEW_AFTER_SECONDS) {
      setSessionCookie(context.switchToHttp().getResponse<Response>(), await this.jwt.signAsync(claimsOf(session.user)));
    }
    return true;
  }

  private async sessionOf(req: Request) {
    const carried = tokenOf(req);
    if (!carried) return null;
    const claims = await this.jwt.verifyAsync<SessionClaims & { readonly iat?: number }>(carried.token).catch(() => null);
    if (typeof claims?.userId !== 'string') return null;

    const user = Option.getOrNull(await this.effect.run(sessionUser(UserId.make(claims.userId))));
    return user ? { user, claims, from: carried.from } : null;
  }
}
