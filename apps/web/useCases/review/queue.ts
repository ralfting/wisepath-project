import { schedule } from "@wisepath/domain/review"
import type { DueCard, Grade, ReviewState } from "@wisepath/domain/review"

/**
 * A review sitting, kept free of React so it can be tested. Grading shows the
 * next card at once: the card's new state is worked out here with the same
 * function the API runs, and sent in the background. A card graded Again goes
 * to the back of the sitting, to be asked once more before it ends.
 */

export interface Sitting {
  /** Cards still to ask; the first is on screen */
  readonly cards: ReadonlyArray<DueCard>
  /** Cards graded so far, a card asked twice counting twice */
  readonly reviewed: number
}

export const startSitting = (cards: ReadonlyArray<DueCard>): Sitting => ({ cards, reviewed: 0 })

/** The sitting after grading the card on screen, and the card's new state (to send) */
export function gradeCard(sitting: Sitting, grade: Grade, now: Date): { sitting: Sitting; state: ReviewState } | null {
  const [card, ...rest] = sitting.cards
  if (!card) return null
  const state = schedule(card.state, grade, now)
  const cards = grade === 1 ? [...rest, { ...card, state }] : rest
  return { sitting: { cards, reviewed: sitting.reviewed + 1 }, state }
}

/** The end of the learner's day where they are: cards due before it are due today */
export function endOfDay(now: Date): Date {
  const end = new Date(now)
  end.setHours(24, 0, 0, 0)
  return end
}
