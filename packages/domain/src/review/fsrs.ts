import { Schema } from "effect"

/**
 * Scheduling
 * When a card is asked again, by FSRS (Free Spaced Repetition Scheduler,
 * version 5, with its published default weights): each card has a stability
 * (how many days until it is 90% likely to be remembered) and a difficulty
 * (1 to 10), both updated from the grade given. The next review is set for
 * when the card is about 90% likely to still be remembered.
 */

/** 1 Again (forgotten) · 2 Hard · 3 Good · 4 Easy */
export const Grade = Schema.Literals([1, 2, 3, 4])
export type Grade = typeof Grade.Type

export const ReviewState = Schema.Struct({
  /** ISO date the card is next asked */
  due: Schema.String,
  stability: Schema.Number,
  difficulty: Schema.Number,
  /** Times reviewed */
  reps: Schema.Number,
  /** Times forgotten (graded Again) after being learned */
  lapses: Schema.Number,
  lastReview: Schema.NullOr(Schema.String)
})
export type ReviewState = typeof ReviewState.Type

/** FSRS-5's default weights, fitted on a large set of reviews */
const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605,
  2.2698, 0.2315, 2.9898, 0.51655, 0.6621
] as const

const DECAY = -0.5
const FACTOR = 19 / 81
/** How likely a card should still be remembered when it comes back */
const RETENTION = 0.9
const MAX_DAYS = 36500
const DAY = 24 * 60 * 60 * 1000
/** A card graded Again comes back within the same sitting */
export const AGAIN_AFTER = 10 * 60 * 1000

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** How likely the card is remembered `days` after its last review */
const retrievability = (days: number, stability: number) => Math.pow(1 + (FACTOR * days) / stability, DECAY)

const initialDifficulty = (grade: Grade) => clamp(W[4] - Math.exp(W[5] * (grade - 1)) + 1, 1, 10)

/** Harder after Again and Hard, easier after Easy, always drifting back towards the default */
function nextDifficulty(difficulty: number, grade: Grade): number {
  const delta = -W[6] * (grade - 3)
  const damped = difficulty + (delta * (10 - difficulty)) / 9
  return clamp(W[7] * initialDifficulty(4) + (1 - W[7]) * damped, 1, 10)
}

function recallStability(s: number, d: number, r: number, grade: Grade): number {
  const hard = grade === 2 ? W[15] : 1
  const easy = grade === 4 ? W[16] : 1
  return s * (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy + 1)
}

function forgetStability(s: number, d: number, r: number): number {
  return Math.min(s, W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)))
}

/** Reviewed again the same day: the time apart is too short to tell much */
const sameDayStability = (s: number, grade: Grade) => s * Math.exp(W[17] * (grade - 3 + W[18]))

/** Days until the card is RETENTION likely to be remembered, at least one */
const intervalDays = (stability: number) =>
  clamp(Math.round((stability / FACTOR) * (Math.pow(RETENTION, 1 / DECAY) - 1)), 1, MAX_DAYS)

/**
 * The card's state after a review. A new card has no state yet (`null`).
 * Again brings it back in a few minutes; any other grade, in whole days that
 * grow with every successful review.
 */
export function schedule(state: ReviewState | null, grade: Grade, now: Date): ReviewState {
  let stability: number
  let difficulty: number
  let lapses = state?.lapses ?? 0

  if (!state || state.reps === 0) {
    stability = W[grade - 1]
    difficulty = initialDifficulty(grade)
  } else {
    const days = state.lastReview ? Math.max(0, (now.getTime() - Date.parse(state.lastReview)) / DAY) : 0
    const r = retrievability(days, state.stability)
    difficulty = nextDifficulty(state.difficulty, grade)
    if (days < 1) stability = sameDayStability(state.stability, grade)
    else if (grade === 1) stability = forgetStability(state.stability, state.difficulty, r)
    else stability = recallStability(state.stability, state.difficulty, r, grade)
    if (grade === 1) lapses += 1
  }
  stability = clamp(stability, 0.01, MAX_DAYS)

  const wait = grade === 1 ? AGAIN_AFTER : intervalDays(stability) * DAY
  return {
    due: new Date(now.getTime() + wait).toISOString(),
    stability,
    difficulty,
    reps: (state?.reps ?? 0) + 1,
    lapses,
    lastReview: now.toISOString()
  }
}

/** How long until the card comes back for each grade, in milliseconds: shown on the grade buttons */
export function nextIntervals(state: ReviewState | null, now: Date): Record<Grade, number> {
  const after = (grade: Grade) => Date.parse(schedule(state, grade, now).due) - now.getTime()
  return { 1: after(1), 2: after(2), 3: after(3), 4: after(4) }
}
