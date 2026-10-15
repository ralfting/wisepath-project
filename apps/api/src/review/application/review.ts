import { Effect, Option } from 'effect';
import type { ProjectId } from '@wisepath/domain/projects';
import { CardNotFound, cardsOf, dueToday, reviewCounts, schedule } from '@wisepath/domain/review';
import type { CardId, GradeCard } from '@wisepath/domain/review';
import { CurrentUser } from '../../projects/application/CurrentUser';
import { ProjectStore } from '../../projects/application/ProjectStore';
import { ReviewStore } from './ReviewStore';

/**
 * Review use cases. The cards are read from the learner's pages each time
 * (a line edited a moment ago is already a card, or no longer one), then
 * joined with the review states kept for them.
 */

/** Every card in the learner's paths, or in one of them */
const cardsOwned = Effect.fn('review.cards')(function* (projectId?: ProjectId) {
  const user = yield* CurrentUser;
  const projects = yield* ProjectStore;

  const owned = yield* projects.listOwned(user.id);
  return owned.filter((p) => projectId === undefined || p.id === projectId).flatMap(cardsOf);
});

export const dueCards = Effect.fn('review.due')(function* (options: { readonly projectId?: ProjectId; readonly dayEnds: Date }) {
  const user = yield* CurrentUser;
  const reviews = yield* ReviewStore;

  const cards = yield* cardsOwned(options.projectId);
  const states = yield* reviews.listOwned(user.id);
  return dueToday(cards, states, { dayEnds: options.dayEnds });
});

export const counts = Effect.fn('review.counts')(function* (options: { readonly dayEnds: Date }) {
  const user = yield* CurrentUser;
  const reviews = yield* ReviewStore;

  const cards = yield* cardsOwned();
  const states = yield* reviews.listOwned(user.id);
  return reviewCounts(cards, states, { dayEnds: options.dayEnds });
});

/**
 * Grades a card and schedules its next review. The grade says how many times
 * the card had been reviewed when it was shown: sent again (a retry), it finds
 * the card already further on and returns its state unchanged.
 */
export const grade = Effect.fn('review.grade')(function* (cardId: CardId, command: GradeCard, now = new Date()) {
  const user = yield* CurrentUser;
  const reviews = yield* ReviewStore;

  const card = (yield* cardsOwned()).find((c) => c.id === cardId);
  if (!card) return yield* new CardNotFound({ cardId });

  return yield* reviews.transaction(
    Effect.gen(function* () {
      const kept = yield* reviews.find(user.id, cardId, { lock: true });
      const state = Option.getOrNull(Option.map(kept, (k) => k.state));
      if (state && state.reps !== command.reps) return state;

      const next = schedule(state, command.grade, now);
      yield* reviews.save(user.id, card, next);
      return next;
    }),
  );
});
