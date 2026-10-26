import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { NoteId, PageId, locateQuote, mayWriteNotes, quoteAt, removeNote, samplePath, writeNote } from "../src/paths/index"
import type { Path } from "../src/paths/index"

const guards = PageId.make("guards")
const noteId = NoteId.make("note-1")
const pageOf = (path: Path) => path.pages.find((p) => p.id === guards)!

describe("locateQuote", () => {
  const text = "A borrow ends at its last use. Two shared borrows may overlap; a mutable borrow may not."

  it("finds the words a quote was made on", () => {
    const quote = quoteAt(text, 2, 8)!
    assert.deepStrictEqual(locateQuote(text, quote), { start: 2, end: 8 })
  })

  it("tells repeated words apart by what surrounds them", () => {
    const start = text.lastIndexOf("borrow")
    const quote = quoteAt(text, start, start + 6)!
    assert.deepStrictEqual(locateQuote(text, quote), { start, end: start + 6 })
  })

  it("follows the words when the text around them is rewritten", () => {
    const start = text.indexOf("mutable borrow")
    const quote = quoteAt(text, start, start + 14)!
    const edited = `Lifetimes first.\n${text.replace("Two shared", "Many shared")}`
    const moved = edited.indexOf("mutable borrow")
    assert.deepStrictEqual(locateQuote(edited, quote), { start: moved, end: moved + 14 })
  })

  it("finds nothing once the words are gone", () => {
    const quote = quoteAt(text, 2, 8)!
    assert.isNull(locateQuote("A loan ends at its last use.", quote))
  })

  it("has nothing to quote in blank space", () => {
    assert.isNull(quoteAt("a   b", 1, 4))
  })
})

describe("note commands", () => {
  it.effect("writes a note on a page and rewrites it by id, keeping when it was made", () =>
    Effect.gen(function*() {
      const quote = { exact: "guards", prefix: "", suffix: "" }
      const first = yield* writeNote(samplePath, { pageId: guards, note: { id: noteId, quote, body: "Why?" } }, new Date("2030-01-01"))
      const second = yield* writeNote(first, { pageId: guards, note: { id: noteId, quote, body: "Order" } }, new Date("2030-01-02"))

      assert.deepStrictEqual(pageOf(second).notes, [
        { id: noteId, quote, body: "Order", createdAt: "2030-01-01T00:00:00.000Z", updatedAt: "2030-01-02T00:00:00.000Z" }
      ])
      assert.deepStrictEqual([pageOf(second).content, pageOf(second).updatedAt], [pageOf(samplePath).content, pageOf(samplePath).updatedAt])
    }))

  it.effect("changes nothing when the same note is written again", () =>
    Effect.gen(function*() {
      const command = { pageId: guards, note: { id: noteId, body: "Why?" } }
      const once = yield* writeNote(samplePath, command)
      assert.strictEqual(yield* writeNote(once, command, new Date("2031-01-01")), once)
    }))

  it.effect("removes a note, and removing it again changes nothing", () =>
    Effect.gen(function*() {
      const written = yield* writeNote(samplePath, { pageId: guards, note: { id: noteId, body: "Why?" } })
      const removed = removeNote(written, { pageId: guards, noteId })
      assert.deepStrictEqual(pageOf(removed).notes, [])
      assert.strictEqual(removeNote(removed, { pageId: guards, noteId }), removed)
      assert.strictEqual(removeNote(removed, { pageId: PageId.make("gone"), noteId }), removed)
    }))

  it.effect("refuses a note on a page that is gone", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(writeNote(samplePath, { pageId: PageId.make("gone"), note: { id: noteId, body: "" } }))
      assert.strictEqual(error._tag, "PageNotFound")
    }))

  it("lets anyone who reads the path keep notes on it", () => {
    const table = (["owner", "editor", "viewer", "none"] as const).map((access) => mayWriteNotes({ access }))
    assert.deepStrictEqual(table, [true, true, true, false])
  })
})
