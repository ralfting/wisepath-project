import { Schema } from "effect"
import { readCalloutMarker } from "./callouts"
import { normalize, textHash, withoutCode } from "./markdown"
import type { Page, PathId } from "./Path"

/**
 * Activities (docs/plans/22-page-activities.md)
 * Something a page asks the learner to do, written as a callout of its own:
 *
 *   > [!activity]
 *   > Write two things you like doing when you read.
 *
 * An activity is read from the page's text whenever it is needed, never stored; only each reader's ticks are kept
 * (Page.done). In a learning path a page counts as studied only once its activities are done.
 */

/** Names an activity by its path, its page and its words, so it survives other activities moving around it */
export const ActivityId = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(64)).pipe(Schema.brand("ActivityId"))
export type ActivityId = typeof ActivityId.Type

/** One activity of a page: its name and its words as written, white space collapsed */
export interface Activity {
  readonly id: ActivityId
  readonly text: string
}

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

/**
 * A page's activities in the order they are written. Code (fenced or inline) is never one. The same words twice
 * on a page are two activities, told apart by which comes first.
 */
export function activitiesIn(pathId: PathId, page: Pick<Page, "id" | "content">): ReadonlyArray<Activity> {
  const original = page.content.split("\n")
  // Lines inside code come out blank; every other line keeps its words as written, inline code included
  const lines = withoutCode(page.content).split("\n").map((line, index) => (line.trim() ? original[index] : line))
  const seen = new Map<string, number>()
  const activities: Array<Activity> = []

  for (const quote of quotesIn(lines)) {
    const marker = readCalloutMarker(quote.join("\n"))
    if (marker?.kind !== "activity") continue
    const text = normalize(marker.rest)
    const repeat = seen.get(text) ?? 0
    seen.set(text, repeat + 1)
    const name = `${pathId}\n${page.id}\n${text}${repeat > 0 ? `\n${repeat}` : ""}`
    activities.push({ id: ActivityId.make(textHash(name)), text })
  }
  return activities
}

/** The page's activities its reader has not ticked yet */
export function openActivities(pathId: PathId, page: Pick<Page, "id" | "content" | "done">): ReadonlyArray<Activity> {
  const done = new Set(page.done ?? [])
  return activitiesIn(pathId, page).filter((activity) => !done.has(activity.id))
}
