import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Effect, Schema } from 'effect';
import { SearchLimit } from '@wisepath/contract';
import { SearchHit } from '@wisepath/domain/search';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt.guard';
import { CurrentUser } from '../../paths/application/CurrentUser';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { SchemaPipe } from '../../shared/infrastructure/SchemaPipe';
import { searchPages } from '../application/search';

const SearchQuery = Schema.Struct({ q: Schema.String, limit: Schema.optional(SearchLimit) });

/**
 * SearchController
 * /api/search as the contract (SearchApiGroup in @wisepath/contract)
 * describes it: the session's user's pages only.
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly effect: EffectRuntime) {}

  @Get('search')
  search(@Req() req: Request, @Query(new SchemaPipe(SearchQuery)) query: typeof SearchQuery.Type) {
    const program = searchPages(query.q, query.limit).pipe(Effect.provideService(CurrentUser, { id: req.user!.id }));
    return this.effect.respond(program, Schema.Array(SearchHit));
  }
}
