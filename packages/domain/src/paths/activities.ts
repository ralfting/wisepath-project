import { Schema } from "effect"
import { readCalloutMarker } from "./callouts"
import type { CalloutKind } from "./callouts"
import { normalize, textHash, withoutCode } from "./markdown"
import type { Page, Path, PathId } from "./Path"

/**
 * Activities (docs/plans/22-page-activities.md)
 * Something a page asks the learner to do, written as a callout of its own:
 *
 *   > [!activity]
 *   > Write two things you like doing when you read.
 *
 * An activity is read from the page's text whenever it is needed, never stored; only each reader's ticks are kept
 * (Page.done). In a learning path a page counts as studied only once its activities are done.
 *
 * Questions (docs/plans/24-page-questions.md) are read the same way, from a `> [!question]` callout; each reader's
 * answers are kept (Page.answers), and in a learning path an unanswered one holds the page as an open activity does.
 */

/** Names an activity by its path, its page and its words, so it survives other activities moving around it */
export const ActivityId = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(64)).pipe(Schema.brand("ActivityId"))
export type ActivityId = typeof ActivityId.Type

/** One activity of a page: its name and its words as written, white space collapsed */
export interface Activity {
  readonly id: ActivityId
  readonly text: string
}

/** Names a question as an activity is named; the answers written to it are kept under this name */
export const QuestionId = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(64)).pipe(Schema.brand("QuestionId"))
export type QuestionId = typeof QuestionId.Type

/** One question of a page: its name and its words as written, white space collapsed */
export interface Question {
  readonly id: QuestionId
  readonly text: string
}

/** The longest answer a reader can write, as long as a note */
export const MAX_ANSWER = 20000

/** A reader's answer to one of a page's questions, as typed. Never blank: blank is no answer */
export const Answer = Schema.Struct({
  question: QuestionId,
  body: Schema.String.check(Schema.isMaxLength(MAX_ANSWER), Schema.isPattern(/\S/, { message: "Write an answer" }))
})
export type Answer = typeof Answer.Type

/** A quote line, at any indent or right after a list marker (a quote inside a list item): what follows its > */
const QUOTE_LINE = /^\s*(?:(?:[-*+]|\d+[.)])\s+)?>[ \t]?(.*)$/

/** A line that starts a block of its own, so it can't carry on a quote's paragraph */
const BLOCK_START = /^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|```|~~~|<|\||(?:[-*_]\s*){3,}$)/

/**
 * Every quote in the lines, in reading order, each as the lines inside it with one > taken off; quotes inside a
 * quote follow the one they are in. A plain line right after a quote's text carries it on, as markdown reads it.
 */
function quotesIn(lines: ReadonlyArray<string>): Array<Array<string>> {
  const quotes: Array<Array<string>> = []
  let i = 0
  while (i < lines.length) {
    const first = QUOTE_LINE.exec(lines[i])
    if (!first) {
      i++
      continue
    }
    const inner = [first[1]]
    for (i++; i < lines.length; i++) {
      const line = QUOTE_LINE.exec(lines[i])
      if (line) inner.push(line[1])
      else if (lines[i].trim() && inner[inner.length - 1].trim() && !BLOCK_START.test(lines[i])) inner.push(lines[i])
      else break
    }
    quotes.push(inner, ...quotesIn(inner))
  }
  return quotes
}

/** A callout of one kind as a page holds it: the hash naming it, and its words with white space collapsed */
interface CalloutText {
  readonly hash: string
  readonly text: string
}

/**
 * A page's callouts of one kind in the order they are written. Code (fenced or inline) is never one. The same words
 * twice on a page are two, told apart by which comes first. `salt` keeps one kind's names from another's.
 */
function calloutsIn(kind: CalloutKind, salt: string, pathId: PathId, page: Pick<Page, "id" | "content">): Array<CalloutText> {
  const original = page.content.split("\n")
  // Lines inside code come out blank; every other line keeps its words as written, inline code included
  const lines = withoutCode(page.content).split("\n").map((line, index) => (line.trim() ? original[index] : line))
  const seen = new Map<string, number>()
  const found: Array<CalloutText> = []

  for (const quote of quotesIn(lines)) {
    const marker = readCalloutMarker(quote.join("\n"))
    if (marker?.kind !== kind) continue
    const text = normalize(marker.rest)
    const repeat = seen.get(text) ?? 0
    seen.set(text, repeat + 1)
    found.push({ hash: textHash(`${salt}${pathId}\n${page.id}\n${text}${repeat > 0 ? `\n${repeat}` : ""}`), text })
  }
  return found
}

/** A page's activities in the order they are written */
export function activitiesIn(pathId: PathId, page: Pick<Page, "id" | "content">): ReadonlyArray<Activity> {
  // Named before questions were, so with no salt: the ticks already stored keep their activities
  return calloutsIn("activity", "", pathId, page).map(({ hash, text }) => ({ id: ActivityId.make(hash), text }))
}

/** A page's questions in the order they are written */
export function questionsIn(pathId: PathId, page: Pick<Page, "id" | "content">): ReadonlyArray<Question> {
  return calloutsIn("question", "question\n", pathId, page).map(({ hash, text }) => ({ id: QuestionId.make(hash), text }))
}

/** What a page asks of its reader: an activity to do, or a question to answer */
export type Task =
  | { readonly kind: "activity"; readonly id: ActivityId; readonly text: string }
  | { readonly kind: "question"; readonly id: QuestionId; readonly text: string }

/** Everything the page asks, activities first, each kind in text order */
export function tasksIn(pathId: PathId, page: Pick<Page, "id" | "content">): ReadonlyArray<Task> {
  return [
    ...activitiesIn(pathId, page).map((activity) => ({ kind: "activity" as const, ...activity })),
    ...questionsIn(pathId, page).map((question) => ({ kind: "question" as const, ...question }))
  ]
}

/**
 * What the page asks that its reader has not done yet: activities not ticked, questions not answered. The studied
 * control, the learning path's gate and the map's badge all read this one list.
 */
export function openTasks(path: Pick<Path, "id">, page: Pick<Page, "id" | "content" | "done" | "answers">): ReadonlyArray<Task> {
  const done = new Set<string>([...(page.done ?? []), ...(page.answers ?? []).map((answer) => answer.question)])
  return tasksIn(path.id, page).filter((task) => !done.has(task.id))
}

/**
 * The questions the author reworded in place between two versions of a page, each old name with its new one, so
 * their answers follow them. Paired by position, and only when the page holds as many questions before and after;
 * a pair counts only when the old name is gone and the new one is new, so moving questions around renames nothing.
 */
export function rewordedQuestions(
  pathId: PathId,
  before: Pick<Page, "id" | "content">,
  after: Pick<Page, "id" | "content">
): Array<{ readonly from: QuestionId; readonly to: QuestionId }> {
  const was = questionsIn(pathId, before).map((question) => question.id)
  const now = questionsIn(pathId, after).map((question) => question.id)
  if (was.length !== now.length) return []
  return was
    .map((from, index) => ({ from, to: now[index] }))
    .filter(({ from, to }) => !now.includes(from) && !was.includes(to))
}
