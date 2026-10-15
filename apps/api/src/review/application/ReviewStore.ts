import { Context } from 'effect';
import type { Effect, Option } from 'effect';
import type { UserId } from '@wisepath/domain/auth';
import type { Card, CardId, KeptState, ReviewState } from '@wisepath/domain/review';

/**
 * Where review states are kept. Storage failures are defects here: the
 * request fails with a 500 and is logged.
 */
export class ReviewStore extends Context.Service<
  ReviewStore,
  {
    /** Every state the learner has, of cards that exist or not */
    readonly listOwned: (ownerId: UserId) => Effect.Effect<ReadonlyArray<KeptState>>;

    /** One card's state; `lock` holds it until the transaction ends, so two grades of it run one at a time */
    readonly find: (ownerId: UserId, cardId: CardId, options?: { readonly lock?: boolean }) => Effect.Effect<Option.Option<KeptState>>;

    /** Writes a card's new state; the first one also records the card's first review */
    readonly save: (ownerId: UserId, card: Card, state: ReviewState) => Effect.Effect<void>;

    /** Runs the effect in one database transaction */
    readonly transaction: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  }
>()('@wisepath/api/review/application/ReviewStore') {}
