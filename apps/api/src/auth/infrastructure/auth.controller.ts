import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { Option, Schema } from 'effect';
import { UserJson } from '@wisepath/contract';
import { AccountSettings, Credentials, SignupDetails } from '@wisepath/domain/auth';
import type { User } from '@wisepath/domain/auth';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { SchemaPipe } from '../../shared/infrastructure/SchemaPipe';
import * as auth from '../application/auth';
import { JwtAuthGuard } from './jwt.guard';
import { claimsOf, clearSessionCookie, setSessionCookie } from './session';

/** The body of every answer that carries the user */
const UserBody = Schema.Struct({ user: UserJson });
const bodyOf = (user: User) => Schema.encodeSync(UserBody)({ user });

/**
 * AuthController
 * /api/auth as the contract (AuthApiGroup in @wisepath/contract) describes
 * it. The use cases check the account in Effect; this controller starts and
 * ends the session cookie.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly effect: EffectRuntime,
    private readonly jwt: JwtService,
  ) {}

  @Post('signup')
  async signup(@Body(new SchemaPipe(SignupDetails)) details: SignupDetails, @Res({ passthrough: true }) res: Response) {
    const user = await this.effect.run(auth.signup(details));

    setSessionCookie(res, await this.jwt.signAsync(claimsOf(user)));
    return bodyOf(user);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body(new SchemaPipe(Credentials)) credentials: Credentials, @Res({ passthrough: true }) res: Response) {
    const user = await this.effect.run(auth.login(credentials));

    setSessionCookie(res, await this.jwt.signAsync(claimsOf(user)));
    return bodyOf(user);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    clearSessionCookie(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return bodyOf(req.user!);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@Req() req: Request, @Body(new SchemaPipe(AccountSettings)) settings: AccountSettings) {
    const user = await this.effect.run(auth.updateSettings(req.user!.id, settings));
    if (Option.isNone(user)) throw new UnauthorizedException();
    return bodyOf(user.value);
  }
}
