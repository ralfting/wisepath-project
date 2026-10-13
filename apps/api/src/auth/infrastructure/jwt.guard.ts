import { HttpException, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { Option, Schema } from 'effect';
import { NotAuthenticated, UserId } from '@wisepath/domain/auth';
import type { User } from '@wisepath/domain/auth';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { sessionUser } from '../application/auth';
import { tokenOf } from './session';
import type { SessionClaims } from './session';

/** What a request without a valid session is answered with, as the contract describes */
const notAuthenticated = () => new HttpException(Schema.encodeSync(NotAuthenticated)(new NotAuthenticated()), 401);

/**
 * JwtAuthGuard
 * Lets a request through when it carries a valid, unexpired session token
 * whose account still exists, and puts that user on the request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly effect: EffectRuntime,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = await this.userOf(req);
    if (!user) throw notAuthenticated();

    req.user = user;
    return true;
  }

  private async userOf(req: Request): Promise<User | null> {
    const token = tokenOf(req);
    if (!token) return null;
    const claims = await this.jwt.verifyAsync<SessionClaims>(token).catch(() => null);
    if (typeof claims?.userId !== 'string') return null;

    return Option.getOrNull(await this.effect.run(sessionUser(UserId.make(claims.userId))));
  }
}
