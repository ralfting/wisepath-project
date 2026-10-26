import { Schema } from "effect"

/**
 * Notes (docs/plans/21-page-notes.md)
 * What a reader writes for themselves on a page, on a passage of it or on the whole page. A note holds the words it
 * was made on, with a few on each side (the W3C Web Annotation text quote selector), not a position: the text may
 * keep changing and the note finds its words again, or says they are gone.
 */

/** Made by the client (a UUID), so a note shows before the server answers */
export const NoteId = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(64)).pipe(Schema.brand("NoteId"))
export type NoteId = typeof NoteId.Type

/** How much text on each side of a passage a quote keeps */
export const QUOTE_CONTEXT = 32

/** The passage a note is on: its words, and the text just before and after them */
export const TextQuote = Schema.Struct({
  exact: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(1000)),
  prefix: Schema.String.check(Schema.isMaxLength(QUOTE_CONTEXT)),
  suffix: Schema.String.check(Schema.isMaxLength(QUOTE_CONTEXT))
})
export type TextQuote = typeof TextQuote.Type

export const PageNote = Schema.Struct({
  id: NoteId,
  /** Absent for a note on the whole page */
  quote: Schema.optional(TextQuote),
  /** Markdown */
  body: Schema.String.check(Schema.isMaxLength(20000)),
  /** ISO dates */
  createdAt: Schema.String,
  updatedAt: Schema.String
})
export type PageNote = typeof PageNote.Type

/** The quote of the passage between start and end of a text; null when there is nothing to quote */
export function quoteAt(text: string, start: number, end: number): TextQuote | null {
  const exact = text.slice(start, Math.min(end, start + 1000))
  if (exact.trim() === "") return null
  return {
    exact,
    prefix: text.slice(Math.max(0, start - QUOTE_CONTEXT), start),
    suffix: text.slice(start + exact.length, start + exact.length + QUOTE_CONTEXT)
  }
}

/** How many characters two strings share at their ends */
const sharedEnd = (a: string, b: string) => {
  let n = 0
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++
  return n
}

/** How many characters two strings share at their starts */
const sharedStart = (a: string, b: string) => {
  let n = 0
  while (n < a.length && n < b.length && a[n] === b[n]) n++
  return n
}

/**
 * Where a quote sits in a text now: of the places its words appear, the one whose surroundings match its prefix and
 * suffix best, the first on a tie. Null when the words are gone.
 */
export function locateQuote(text: string, quote: TextQuote): { start: number; end: number } | null {
  let best: { start: number; score: number } | null = null
  for (let at = text.indexOf(quote.exact); at !== -1; at = text.indexOf(quote.exact, at + 1)) {
    const end = at + quote.exact.length
    const score = sharedEnd(text.slice(0, at), quote.prefix) + sharedStart(text.slice(end), quote.suffix)
    if (best === null || score > best.score) best = { start: at, score }
  }
  return best && { start: best.start, end: best.start + quote.exact.length }
}
