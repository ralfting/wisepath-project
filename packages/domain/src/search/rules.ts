import type { Excerpt, Mark } from "./Search"

/**
 * Search rules: how text is compared, how results are ordered, and which bit
 * of a page's text is shown under a result. Pure, so the API and the web
 * agree on them.
 */

/** Text as search compares it: lower case, without accents ("Revisão" → "revisao") */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

/** The words of a query, folded, each once */
export function queryWords(query: string): ReadonlyArray<string> {
  return [...new Set(fold(query).split(/\s+/).filter(Boolean))]
}

/** The folded text with, for each of its characters, where it came from in the original */
function foldWithOffsets(text: string): { folded: string; from: Array<number> } {
  let folded = ""
  const from: Array<number> = []
  for (let i = 0; i < text.length;) {
    const char = String.fromCodePoint(text.codePointAt(i)!)
    const part = fold(char)
    for (let k = 0; k < part.length; k++) from.push(i)
    folded += part
    i += char.length
  }
  from.push(text.length)
  return { folded, from }
}

/** Every place the query's words appear in the text, in order, overlapping ones merged */
export function marksIn(text: string, query: string): ReadonlyArray<Mark> {
  const { folded, from } = foldWithOffsets(text)
  const found: Array<[number, number]> = []
  for (const word of queryWords(query)) {
    for (let at = folded.indexOf(word); at !== -1; at = folded.indexOf(word, at + word.length)) {
      found.push([from[at], from[at + word.length]])
    }
  }
  found.sort((a, b) => a[0] - b[0] || a[1] - b[1])

  const merged: Array<[number, number]> = []
  for (const mark of found) {
    const last = merged[merged.length - 1]
    if (last && mark[0] <= last[1]) last[1] = Math.max(last[1], mark[1])
    else merged.push([mark[0], mark[1]])
  }
  return merged
}

/** True when every word of the query appears in the text */
export function matchesAll(text: string, query: string): boolean {
  const folded = fold(text)
  const words = queryWords(query)
  return words.length > 0 && words.every((word) => folded.includes(word))
}

/** How well a title answers a query, best first; "none" when only the text matched */
export type TitleMatch = "exact" | "prefix" | "words" | "none"
const TITLE_ORDER: ReadonlyArray<TitleMatch> = ["exact", "prefix", "words", "none"]

const squash = (text: string) => fold(text).trim().replace(/\s+/g, " ")

export function titleMatch(title: string, query: string): TitleMatch {
  const t = squash(title)
  const q = squash(query)
  if (!q || !t) return "none"
  if (t === q) return "exact"
  if (t.startsWith(q)) return "prefix"
  return matchesAll(t, q) ? "words" : "none"
}

/**
 * Results in the order they are shown: the exact title, titles that start
 * with the query, titles with all its words, then pages whose text matches;
 * the most recently edited first within each.
 */
export function rankHits<T extends { readonly title: string; readonly updatedAt: string }>(
  query: string,
  hits: ReadonlyArray<T>
): Array<T> {
  const tier = (hit: T) => TITLE_ORDER.indexOf(titleMatch(hit.title, query))
  return hits
    .map((hit) => ({ hit, tier: tier(hit), time: Date.parse(hit.updatedAt) || 0 }))
    .sort((a, b) => a.tier - b.tier || b.time - a.time)
    .map(({ hit }) => hit)
}

/** Markdown that starts a line (headings, list items, tasks, quotes) and says nothing about the match */
const LINE_MARKERS = /^\s*(?:#{1,6}\s+|>\s*|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)/

/** How much of the line is kept before the first match when the line is too long to show whole */
const LEAD = 30

/**
 * The line of the text where the query first appears, cut to about `width`
 * characters around it (about what one line of a result shows), with the
 * matches marked; null when the text doesn't contain any of its words.
 */
export function excerptOf(content: string, query: string, width = 90): Excerpt | null {
  for (const raw of content.split("\n")) {
    const line = raw.replace(LINE_MARKERS, "").trim()
    const marks = marksIn(line, query)
    if (marks.length === 0) continue
    if (line.length <= width) return { text: line, marks }

    // Start a little before the match, at a word's start, and end at a word's end
    let start = Math.max(0, marks[0][0] - LEAD)
    if (start > 0) {
      const space = line.indexOf(" ", start)
      start = space !== -1 && space < marks[0][0] ? space + 1 : start
    }
    let end = Math.min(line.length, start + width)
    if (end < line.length) {
      const space = line.lastIndexOf(" ", end)
      end = space > marks[0][1] ? space : end
    }
    const text = `${start > 0 ? "…" : ""}${line.slice(start, end).trim()}${end < line.length ? "…" : ""}`
    return { text, marks: marksIn(text, query) }
  }
  return null
}
