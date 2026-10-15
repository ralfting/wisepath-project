import { Effect, Layer, Option } from 'effect';
import { and, eq } from 'drizzle-orm';
import type { UserId } from '@wisepath/domain/auth';
import { CardId } from '@wisepath/domain/review';
import type { Card, KeptState, ReviewState } from '@wisepath/domain/review';
import { Database } from '../../shared/infrastructure/database/Database';
import { reviewStates } from '../../shared/infrastructure/database/schema';
import { ReviewStore } from '../application/ReviewStore';

/** Review states in Postgres through Drizzle */

const toDomain = (row: typeof reviewStates.$inferSelect): KeptState => ({
  cardId: CardId.make(row.cardId),
  firstReview: row.firstReview.toISOString(),
  state: {
    due: row.due.toISOString(),
    stability: row.stability,
    difficulty: row.difficulty,
    reps: row.reps,
    lapses: row.lapses,
    lastReview: row.lastReview?.toISOString() ?? null,
  },
});

export const DrizzleReviewStore = Layer.effect(
  ReviewStore,
  Effect.gen(function* () {
    const { db, run, transaction } = yield* Database;

    const listOwned = Effect.fn('ReviewStore.listOwned')(function* (ownerId: UserId) {
      const rows = yield* run(db.select().from(reviewStates).where(eq(reviewStates.ownerId, ownerId)));
      return rows.map(toDomain);
    });

    const find = Effect.fn('ReviewStore.find')(function* (ownerId: UserId, cardId: CardId, options?: { readonly lock?: boolean }) {
      const query = db
        .select()
        .from(reviewStates)
        .where(and(eq(reviewStates.ownerId, ownerId), eq(reviewStates.cardId, cardId)));
      const [row] = yield* run(options?.lock ? query.for('update') : query);
      return row ? Option.some(toDomain(row)) : Option.none<KeptState>();
    });

    const save = Effect.fn('ReviewStore.save')(function* (ownerId: UserId, card: Card, state: ReviewState) {
      const columns = {
        projectId: card.projectId,
        pageId: card.pageId,
        due: new Date(state.due),
        stability: state.stability,
        difficulty: state.difficulty,
        reps: state.reps,
        lapses: state.lapses,
        lastReview: state.lastReview ? new Date(state.lastReview) : null,
      };
      yield* run(
        db
          .insert(reviewStates)
          .values({ ownerId, cardId: card.id, firstReview: new Date(state.lastReview ?? Date.now()), ...columns })
          .onConflictDoUpdate({ target: [reviewStates.ownerId, reviewStates.cardId], set: columns }),
      );
    });

    return ReviewStore.of({ listOwned, find, save, transaction });
  }),
);
