import { Controller, Delete, Get, HttpCode, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Effect, Schema } from 'effect';
import { AccessNotice, NoticeId } from '@wisepath/domain/paths';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt.guard';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { SchemaPipe } from '../../shared/infrastructure/SchemaPipe';
import { CurrentUser } from '../application/CurrentUser';
import * as notices from '../application/notices';

/**
 * NoticesController
 * /api/notices as the contract (NoticesApiGroup) describes it: the learner's notices of paths they lost.
 */

const asUser = (req: Request) => Effect.provideService(CurrentUser, { id: req.user!.id });

@Controller('notices')
@UseGuards(JwtAuthGuard)
export class NoticesController {
  constructor(private readonly effect: EffectRuntime) {}

  @Get()
  list(@Req() req: Request) {
    return this.effect.respond(notices.listNotices().pipe(asUser(req)), Schema.Array(AccessNotice));
  }

  @Delete(':noticeId')
  @HttpCode(204)
  async dismiss(@Req() req: Request, @Param('noticeId', new SchemaPipe(NoticeId)) id: NoticeId) {
    await this.effect.run(notices.dismissNotice(id).pipe(asUser(req)));
  }
}
