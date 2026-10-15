import { Schema } from "effect"
import { PageId, ProjectId } from "../projects/Project"
import type { Page, Project } from "../projects/Project"

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
  projectId: ProjectId,
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

/** The markdown with code blocks and inline code blanked out, keeping the lines where they were */
function withoutCode(markdown: string): string {
  return markdown
    .replace(/^(\s*)(```|~~~)[^\n]*\n[\s\S]*?(?:^\s*\2[^\n]*$|(?![\s\S]))/gm, (block) => block.replace(/[^\n]/g, " "))
    .replace(/`[^`\n]*`/g, (code) => " ".repeat(code.length))
}

/**
 * A short, stable hash (cyrb53) as hex. Not for security: it only names a
 * card, the same way in the browser and on the server.
 */
function hash(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0")
}

const normalize = (text: string) => text.trim().replace(/\s+/g, " ")

/**
 * A card's identity: its path, its page and its question. Editing the answer
 * keeps the card (and its history); editing the question makes a new one.
 */
export function cardId(projectId: ProjectId, pageId: PageId, question: string): CardId {
  return CardId.make(hash(`${projectId}\n${pageId}\n${normalize(question)}`))
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
  project: Pick<Project, "id" | "title">
): Card[] {
  const projectId = project.id
  const cards: Card[] = []
  const seen = new Set<string>()
  const add = (kind: CardKind, question: string, answer: string) => {
    const id = cardId(projectId, page.id, question)
    // The same question twice on a page is one card
    if (seen.has(id)) return
    seen.add(id)
    cards.push({
      id,
      projectId,
      pageId: page.id,
      kind,
      question: normalize(question),
      answer: normalize(answer),
      pathTitle: project.title,
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
 * Every card in a path, page by page in the order the pages were added. Reviewing is a study's: a learning
 * path, followed page by page, has none (its lines stay text, and come back as cards if it turns into a study)
 */
export function cardsOf(
  project: Pick<Project, "id" | "title"> & { readonly kind?: Project["kind"]; readonly pages: ReadonlyArray<Pick<Page, "id" | "title" | "content">> }
): Card[] {
  if (project.kind === "learningPath") return []
  return project.pages.flatMap((page) => cardsIn(page, project))
}
