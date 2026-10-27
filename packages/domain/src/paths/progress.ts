import { Effect, Schema } from "effect"
import { ActivitiesOpen } from "./errors"
import type { Page, Path } from "./Path"
import type { Answer } from "./activities"
import { ActivityId, MAX_ANSWER, QuestionId, activitiesIn, openTasks, questionsIn, rewordedQuestions } from "./activities"

/**
 * Progress
 * What a reader keeps of a page for themselves: their studied mark, the activities they ticked done and their answers
 * to its questions. None of it is an edit of the page, so reading the path is enough to make it (mayEditPage).
 */

/**
 * More changes than a page could hold activities or questions: no learner sends them, and the cap keeps anyone from
 * filling the tables
 */
const MAX_CHANGES = 500

/**
 * One activity ticked done or unticked. A change, not the whole set: a device that read the page a while ago adds
 * its tick to what the reader ticked elsewhere since, instead of writing its old set over it
 */
export const Tick = Schema.Struct({ activity: ActivityId, done: Schema.Boolean })
export type Tick = typeof Tick.Type

/** One answer written, rewritten or, blank, taken away; a change, as a tick is */
export const AnswerEdit = Schema.Struct({ question: QuestionId, body: Schema.String.check(Schema.isMaxLength(MAX_ANSWER)) })
export type AnswerEdit = typeof AnswerEdit.Type

/** The ticks one edit carries */
export const Ticks = Schema.Array(Tick).check(Schema.isMaxLength(MAX_CHANGES))
/** The answers one edit carries */
export const AnswerEdits = Schema.Array(AnswerEdit).check(Schema.isMaxLength(MAX_CHANGES))

/**
 * The reader's progress on a page: their ticks and answers, then their studied mark. Both are kept only for what the
 * page asks now, so a tick or an answer on something reworded since drops out. In a learning path a page is studied
 * once nothing it asks is open, so marking it with something open is refused, and unticking an activity or clearing
 * an answer unmarks it. Something added to a page already studied leaves the mark: the condition holds when marking.
 * None of it is an edit of the page.
 */
export const setProgress = Effect.fnUntraced(function*(
  path: Path,
  page: Page,
  studied: boolean | undefined,
  ticks: ReadonlyArray<Tick>,
  answers: ReadonlyArray<AnswerEdit>
) {
  const activities = new Set<string>(activitiesIn(path.id, page).map((activity) => activity.id))
  const questions = new Set<string>(questionsIn(path.id, page).map((question) => question.id))

  const wasDone = new Set(page.done ?? [])
  const done = new Set([...wasDone].filter((id) => activities.has(id)))
  for (const change of ticks) {
    if (!activities.has(change.activity)) continue
    if (change.done) done.add(change.activity)
    else done.delete(change.activity)
  }

  const wasAnswered = new Map<QuestionId, Answer>((page.answers ?? []).map((answer) => [answer.question, answer]))
  const answered = new Map([...wasAnswered].filter(([id]) => questions.has(id)))
  for (const change of answers) {
    if (!questions.has(change.question)) continue
    if (change.body.trim() === "") answered.delete(change.question)
    else if (answered.get(change.question)?.body !== change.body) answered.set(change.question, change)
  }

  const { done: _done, answers: _answers, ...rest } = page
  const next: Page = {
    ...rest,
    ...(done.size > 0 ? { done: [...done] } : {}),
    ...(answered.size > 0 ? { answers: [...answered.values()] } : {})
  }
  // A study has no progress to hold back
  const gated = path.kind === "learningPath"
  if (gated && studied === true && !page.studied && openTasks(path, next).length > 0) {
    return yield* new ActivitiesOpen({ pageId: page.id })
  }
  const undone = [...wasDone].some((id) => activities.has(id) && !done.has(id)) ||
    [...wasAnswered.keys()].some((id) => questions.has(id) && !answered.has(id))
  const nextStudied = gated && undone ? false : studied ?? page.studied

  const sameTicks = done.size === wasDone.size && [...done].every((id) => wasDone.has(id))
  const sameAnswers = answered.size === wasAnswered.size && [...answered].every(([id, answer]) => wasAnswered.get(id) === answer)
  if (sameTicks && sameAnswers && nextStudied === page.studied) return path
  return { ...path, pages: path.pages.map((p) => (p.id === page.id ? { ...next, studied: nextStudied } : p)) }
})

/**
 * The path with the reader's answers on a page following its questions reworded in place (rewordedQuestions), as
 * the API moves every reader's answers when it stores the new text
 */
export function withRewordedAnswers(path: Path, before: Page): Path {
  const after = path.pages.find((p) => p.id === before.id)
  if (!after?.answers || after.content === before.content) return path
  const moves = new Map(rewordedQuestions(path.id, before, after).map(({ from, to }) => [from, to]))
  if (moves.size === 0) return path
  const answers = after.answers.map((answer) => {
    const to = moves.get(answer.question)
    return to ? { ...answer, question: to } : answer
  })
  return { ...path, pages: path.pages.map((p) => (p.id === after.id ? { ...after, answers } : p)) }
}
