import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Effect, Schema } from 'effect';
import { Capture, InboxItem, InboxItemId } from '@wisepath/domain/inbox';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt.guard';
import { CurrentUser } from '../../projects/application/CurrentUser';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { SchemaPipe } from '../../shared/infrastructure/SchemaPipe';
import * as inbox from '../application/inbox';

/**
 * InboxController
 * /api/inbox as the contract (CaptureApiGroup in @wisepath/contract)
 * describes it.
 */

/** Runs as the session's user, whom the guard put on the request */
const asUser = (req: Request) => Effect.provideService(CurrentUser, { id: req.user!.id });

@Controller('inbox')
@UseGuards(JwtAuthGuard)
export class InboxController {
  constructor(private readonly effect: EffectRuntime) {}

  @Get()
  list(@Req() req: Request) {
    return this.effect.respond(inbox.listInbox().pipe(asUser(req)), Schema.Array(InboxItem));
  }

  @Post()
  capture(@Req() req: Request, @Body(new SchemaPipe(Capture)) command: Capture) {
    return this.effect.respond(inbox.captureItem(command).pipe(asUser(req)), InboxItem);
  }

  @Delete(':itemId')
  @HttpCode(204)
  async discard(@Req() req: Request, @Param('itemId', new SchemaPipe(InboxItemId)) id: InboxItemId) {
    await this.effect.run(inbox.discardItem(id).pipe(asUser(req)));
  }
}
