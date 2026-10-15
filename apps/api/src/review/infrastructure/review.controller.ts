import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Effect, Schema } from 'effect';
import { InvalidRequest } from '@wisepath/contract';
import { ProjectId } from '@wisepath/domain/projects';
import { CardId, DueCard, GradeCard, ReviewCounts, ReviewState } from '@wisepath/domain/review';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt.guard';
import { CurrentUser } from '../../projects/application/CurrentUser';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { SchemaPipe } from '../../shared/infrastructure/SchemaPipe';
import * as review from '../application/review';

/**
 * ReviewController
 * /api/review as the contract (ReviewApiGroup in @wisepath/contract)
 * describes it.
 */

const asUser = (req: Request) => Effect.provideService(CurrentUser, { id: req.user!.id });

const DueQuery = Schema.Struct({ dayEnds: Schema.String, projectId: Schema.optional(ProjectId) });
const CountsQuery = Schema.Struct({ dayEnds: Schema.String });

/** The end of the learner's day, as a date; anything else is a bad request */
function dayEnds(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(Schema.encodeSync(InvalidRequest)(new InvalidRequest({ message: 'dayEnds must be a date' })));
  }
  return date;
}

@Controller('review')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private readonly effect: EffectRuntime) {}

  @Get('due')
  due(@Req() req: Request, @Query(new SchemaPipe(DueQuery)) query: typeof DueQuery.Type) {
    const options = { dayEnds: dayEnds(query.dayEnds), ...(query.projectId ? { projectId: query.projectId } : {}) };
    return this.effect.respond(review.dueCards(options).pipe(asUser(req)), Schema.Array(DueCard));
  }

  @Get('counts')
  counts(@Req() req: Request, @Query(new SchemaPipe(CountsQuery)) query: typeof CountsQuery.Type) {
    return this.effect.respond(review.counts({ dayEnds: dayEnds(query.dayEnds) }).pipe(asUser(req)), ReviewCounts);
  }

  @Post(':cardId')
  @HttpCode(200)
  grade(@Req() req: Request, @Param('cardId', new SchemaPipe(CardId)) cardId: CardId, @Body(new SchemaPipe(GradeCard)) command: GradeCard) {
    return this.effect.respond(review.grade(cardId, command).pipe(asUser(req)), ReviewState);
  }
}
