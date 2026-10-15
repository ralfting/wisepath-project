import { Schema } from "effect"
import { ProjectId } from "../projects/Project"
import { Card } from "./cards"
import type { CardId } from "./cards"
import { Grade, ReviewState } from "./fsrs"

/**
 * The review queue
 * Which cards are asked today: those whose next review has come, and a few
 * new ones a day (NEW_PER_DAY, across every path), in the order they were
 * written. A state kept for a card no page has anymore is never listed; the
 * card may come back if its line is written again.
 */

/** New cards started per day, across every path */
export const NEW_PER_DAY = 20

const DAY = 24 * 60 * 60 * 1000

/** A card to review, with its state; null for a card never reviewed */
export const DueCard = Schema.Struct({
  ...Card.fields,
  state: Schema.NullOr(ReviewState)
})
export type DueCard = typeof DueCard.Type

/** A review state as it is kept, with when the card was first reviewed */
export interface KeptState {
  readonly cardId: CardId
  readonly state: ReviewState
  /** ISO date of the card's first review: counts it among the new cards of that day */
  readonly firstReview: string
}

export interface QueueOptions {
  /** End of the learner's day (in their time zone): anything due before it is due today */
  readonly dayEnds: Date
  readonly newPerDay?: number
}

/** New cards still allowed today: the daily number less those started since the day began */
function newLeft(states: ReadonlyArray<KeptState>, options: QueueOptions): number {
  const dayStarts = options.dayEnds.getTime() - DAY
  const started = states.filter((s) => Date.parse(s.firstReview) >= dayStarts).length
  return Math.max(0, (options.newPerDay ?? NEW_PER_DAY) - started)
}

/**
 * Today's cards, in the order to ask them: reviews by when they fell due,
 * then new cards in reading order. `states` are all of the learner's, so new
 * cards started in another path count against the day's number too.
 */
export function dueToday(cards: ReadonlyArray<Card>, states: ReadonlyArray<KeptState>, options: QueueOptions): DueCard[] {
  const byCard = new Map(states.map((s) => [s.cardId, s.state]))
  const until = options.dayEnds.getTime()
  const reviews = cards
    .flatMap((card) => {
      const state = byCard.get(card.id)
      return state && Date.parse(state.due) < until ? [{ ...card, state }] : []
    })
    .sort((a, b) => Date.parse(a.state.due) - Date.parse(b.state.due))
  const fresh = cards.filter((card) => !byCard.has(card.id)).slice(0, newLeft(states, options))
  return [...reviews, ...fresh.map((card) => ({ ...card, state: null }))]
}

/** How many cards a path has and how many are due today */
export const PathCards = Schema.Struct({
  projectId: ProjectId,
  cards: Schema.Number,
  due: Schema.Number
})
export type PathCards = typeof PathCards.Type

export const ReviewCounts = Schema.Struct({
  /** Due today across every path: the sidebar's number */
  due: Schema.Number,
  /** Only paths that have cards */
  paths: Schema.Array(PathCards)
})
export type ReviewCounts = typeof ReviewCounts.Type

/** Cards and today's due ones, overall and per path */
export function reviewCounts(cards: ReadonlyArray<Card>, states: ReadonlyArray<KeptState>, options: QueueOptions): ReviewCounts {
  const due = dueToday(cards, states, options)
  const paths = new Map<ProjectId, { projectId: ProjectId; cards: number; due: number }>()
  for (const card of cards) {
    const path = paths.get(card.projectId) ?? { projectId: card.projectId, cards: 0, due: 0 }
    path.cards += 1
    paths.set(card.projectId, path)
  }
  // Each path's own due cards, as its review would list them: its new cards may use the whole day's number
  for (const path of paths.values()) {
    path.due = dueToday(
      cards.filter((c) => c.projectId === path.projectId),
      states,
      options
    ).length
  }
  return { due: due.length, paths: [...paths.values()] }
}

/**
 * A grade for a card, given when it had been reviewed `reps` times. Sent
 * twice (a retry), the second finds the card already further on and changes
 * nothing.
 */
export const GradeCard = Schema.Struct({
  grade: Grade,
  reps: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0))
})
export type GradeCard = typeof GradeCard.Type
