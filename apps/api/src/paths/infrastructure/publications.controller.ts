import { Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Effect, Schema } from 'effect';
import { PathId, PendingPublication } from '@wisepath/domain/paths';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt.guard';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { SchemaPipe } from '../../shared/infrastructure/SchemaPipe';
import { CurrentUser } from '../application/CurrentUser';
import * as publications from '../application/publications';

/** Runs as the session's user, whom the guard put on the request */
const asUser = (req: Request) => Effect.provideService(CurrentUser, { id: req.user!.id });

const pathId = new SchemaPipe(PathId);

/**
 * PublicationsController
 * /api/admin/publications as the contract (AdminApiGroup in @wisepath/contract) describes it: the requests to
 * publish maps to the catalog, which WisePath's administrators approve or decline.
 */
@Controller('admin/publications')
@UseGuards(JwtAuthGuard)
export class PublicationsController {
  constructor(private readonly effect: EffectRuntime) {}

  @Get()
  list(@Req() req: Request) {
    return this.effect.respond(publications.listPublications().pipe(asUser(req)), Schema.Array(PendingPublication));
  }

  @Post(':pathId/approve')
  @HttpCode(204)
  async approve(@Req() req: Request, @Param('pathId', pathId) id: PathId) {
    await this.effect.run(publications.approvePublication(id).pipe(asUser(req)));
  }

  @Post(':pathId/decline')
  @HttpCode(204)
  async decline(@Req() req: Request, @Param('pathId', pathId) id: PathId) {
    await this.effect.run(publications.declinePublication(id).pipe(asUser(req)));
  }
}
