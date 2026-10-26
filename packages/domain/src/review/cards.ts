import { Schema } from "effect"
import { PageId, PathId } from "../paths/Path"
import type { Page, Path } from "../paths/Path"
import { normalize, textHash, withoutCode } from "../paths/markdown"

/**
 * Cards
 * Questions written in the notes themselves. A line `Question :: Answer`
 * is a card, and so is a line with `==words==` in it: the words are hidden
 * and the line is the question (a fill-in-the-blank). Cards are not stored:
 * they are read from the pages whenever they are needed, and only their
 * review state is kept (see ReviewState).
 */

export const CardId = Schema.String.pipe(Schema.brand("CardId"))
export type CardId = typeof CardId.Type

export const CardKind = Schema.Literals(["basic", "cloze"])
export type CardKind = typeof CardKind.Type

export const Card = Schema.Struct({
  id: CardId,
  pathId: PathId,
  pageId: PageId,
  kind: CardKind,
  /** As written, markdown included; for a cloze, the line with its blank as ____ */
  question: Schema.String,
  answer: Schema.String,
  /** Where it was written, to show beside it */
  pathTitle: Schema.String,
  pageTitle: Schema.String
})
export type Card = typeof Card.Type

/** ` :: ` with a space each side, so `std::vector` or `a::b` in a sentence is not a card */
const SEPARATOR = /\s::\s/
const CLOZE = /==([^=\n]+?)==/g

/** The blank a cloze card shows in place of its hidden words */
export const BLANK = "____"

/** List markers, a checkbox, a heading or a quote at the start of a line: not part of the question */
const LINE_PREFIX = /^\s*(?:>\s*)*(?:#{1,6}\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+(?:\[[ xX]\]\s+)?)?/

/**
 * A card's identity: its path, its page and its question. Editing the answer
 * keeps the card (and its history); editing the question makes a new one.
 */
export function cardId(pathId: PathId, pageId: PageId, question: string): CardId {
  return CardId.make(textHash(`${pathId}\n${pageId}\n${normalize(question)}`))
}

/** True when a line of text reads as a `Question :: Answer` card */
export function isCardLine(line: string): boolean {
  const [question, ...rest] = line.replace(LINE_PREFIX, "").split(SEPARATOR)
  return rest.length > 0 && !!question.trim() && !!rest.join(" :: ").trim()
}

/** Where each `==words==` is in a line of text, as [from, to) offsets of the whole mark */
export function clozeRanges(line: string): Array<{ from: number; to: number }> {
  return Array.from(line.matchAll(new RegExp(CLOZE.source, "g")), (m) => ({ from: m.index!, to: m.index! + m[0].length }))
}

/**
 * The cards in a page's markdown, in reading order. Code (fenced or inline)
 * is never a card. A line with `::` is one card; a line with `==words==` is
 * one card per marked word or phrase, the others shown as plain text.
 */
export function cardsIn(
  page: Pick<Page, "id" | "title" | "content">,
  path: Pick<Path, "id" | "title">
): Card[] {
  const pathId = path.id
  const cards: Card[] = []
  const seen = new Set<string>()
  const add = (kind: CardKind, question: string, answer: string) => {
    const id = cardId(pathId, page.id, question)
    // The same question twice on a page is one card
    if (seen.has(id)) return
    seen.add(id)
    cards.push({
      id,
      pathId,
      pageId: page.id,
      kind,
      question: normalize(question),
      answer: normalize(answer),
      pathTitle: path.title,
      pageTitle: page.title
    })
  }

  const original = page.content.split("\n")
  const lines = withoutCode(page.content).split("\n")
  lines.forEach((scrubbed, i) => {
    // Code was blanked out to find the cards; the card itself keeps the line as written
    const prefix = scrubbed.match(LINE_PREFIX)![0].length
    const text = scrubbed.slice(prefix)
    const written = original[i].slice(prefix)
    const separator = text.match(SEPARATOR)
    if (separator) {
      const at = separator.index!
      const question = written.slice(0, at)
      const answer = written.slice(at + separator[0].length)
      if (question.trim() && answer.trim()) add("basic", question, answer)
      return
    }
    const ranges = clozeRanges(text)
    ranges.forEach((hidden, n) => {
      let question = ""
      let last = 0
      ranges.forEach((range, m) => {
        question += written.slice(last, range.from) + (m === n ? BLANK : written.slice(range.from + 2, range.to - 2))
        last = range.to
      })
      question += written.slice(last)
      add("cloze", question, written.slice(hidden.from + 2, hidden.to - 2))
    })
  })
  return cards
}

/**
 * Every card in a path, page by page in the order the pages were added. In a study every page's cards count;
 * in a learning path a page's cards count once it is studied: there is nothing to remember from a page not
 * read yet, and marking it studied is what brings its questions into the review
 */
export function cardsOf(
  path: Pick<Path, "id" | "title"> & {
    readonly kind?: Path["kind"]
    readonly pages: ReadonlyArray<Pick<Page, "id" | "title" | "content"> & { readonly studied?: boolean }>
  }
): Card[] {
  const pages = path.kind === "learningPath" ? path.pages.filter((page) => page.studied) : path.pages
  return pages.flatMap((page) => cardsIn(page, path))
}

/** Whether a page's cards are reviewed: always in a study, once the page is studied in a learning path */
export const pageHasReview = (path: Pick<Path, "kind">, page: Pick<Page, "studied">): boolean =>
  path.kind !== "learningPath" || page.studied
