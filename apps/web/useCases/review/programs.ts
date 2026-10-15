import { Effect } from "effect"
import { Reviews } from "@wisepath/domain/review"
import type { CardId, Grade } from "@wisepath/domain/review"
import type { ProjectId } from "@wisepath/domain/projects"
import { endOfDay } from "./queue"

/** Review use cases as Effect programs; "today" ends at the learner's own midnight */

/** Today's cards, in one path or every one */
export const dueCards = (projectId: ProjectId | null) =>
  Effect.suspend(() => Reviews.use((reviews) => reviews.due({ dayEnds: endOfDay(new Date()), ...(projectId ? { projectId } : {}) }))).pipe(
    Effect.withSpan("useCases.review.due")
  )

/** How many cards are due today, overall and per path */
export const counts = Effect.suspend(() => Reviews.use((reviews) => reviews.counts({ dayEnds: endOfDay(new Date()) }))).pipe(
  Effect.withSpan("useCases.review.counts")
)

/** Grades a card shown after `reps` reviews */
export const grade = Effect.fn("useCases.review.grade")(function*(input: { readonly cardId: CardId; readonly grade: Grade; readonly reps: number }) {
  const reviews = yield* Reviews
  return yield* reviews.grade(input.cardId, { grade: input.grade, reps: input.reps })
})
