import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { Capture, InboxItemId, appendItem, captured, fileItem, freeTitle, itemHere, itemMarkdown, makePage, titleFor, youTubeId } from "../src/inbox/index"
import { PageId, mapTree, samplePath } from "../src/paths/index"

const id = PageId.make
const contentOf = (path: typeof samplePath, pageId: string) => path.pages.find((p) => p.id === pageId)!.content
const video = "https://www.youtube.com/watch?v=abc123"

describe("capturing", () => {
  it("needs something written, and a web address when there is one", () => {
    const is = Schema.is(Capture)
    assert.isTrue(is({ id: "i1", text: "Look into guards" }))
    assert.isFalse(is({ id: "i1", text: "   " }))
    assert.isFalse(is({ id: "i1", text: "x", url: "javascript:alert(1)" }))
    assert.isFalse(is({ id: "i1", text: "x", videoTime: -1 }))
    assert.isTrue(is({ id: "i1", text: video, url: video, title: "A talk", videoTime: 85 }))
  })

  it("keeps what was sent, with when it came in", () => {
    const item = captured({ id: InboxItemId.make("i1"), text: "Hi", title: "  " }, new Date("2026-10-15T10:00:00Z"))
    assert.deepStrictEqual<unknown>(item, { id: "i1", text: "Hi", createdAt: "2026-10-15T10:00:00.000Z" })
  })
})

describe("filing an item into a page", () => {
  it("appends plain text at the end of the page", () => {
    assert.strictEqual(appendItem("# Guards\n\nThey decide.\n\n", { text: "Check the order they run in" }), "# Guards\n\nThey decide.\n\nCheck the order they run in")
    assert.strictEqual(appendItem("", { text: " Alone " }), "Alone")
  })

  it("writes an address as a link on its own line, named by its title", () => {
    assert.strictEqual(itemMarkdown({ text: "https://docs.nestjs.com/guards", url: "https://docs.nestjs.com/guards", title: "Guards [docs]" }), "[Guards docs](https://docs.nestjs.com/guards)")
    assert.strictEqual(itemMarkdown({ text: "Read this", url: "https://example.org/a(b)" }), "Read this\n\n<https://example.org/a(b)>")
    assert.strictEqual(itemMarkdown({ text: "x", url: "https://example.org/a (b)", title: "T" }), "x\n\n[T](https://example.org/a%20%28b%29)")
    // A YouTube address alone on its line is a video in the editor
    assert.strictEqual(itemMarkdown({ text: video, url: video, title: "A talk" }), video)
  })

  it("puts a moment of a video under that video, in time order", () => {
    const page = `Intro\n\n${video}\n\n- [00:30] Setup\n- [02:00] Wrap up\n\nMore text\n\n- other list`
    const filed = appendItem(page, { text: "The key idea", url: `${video}&t=85`, videoTime: 85 })
    assert.strictEqual(filed, `Intro\n\n${video}\n\n- [00:30] Setup\n- [01:25] The key idea\n- [02:00] Wrap up\n\nMore text\n\n- other list`)
    const last = appendItem(page, { text: video, url: video, title: "A talk", videoTime: 3725 })
    assert.include(last, "- [02:00] Wrap up\n- [1:02:05] A talk\n\nMore text")
    // No notes yet: the list starts right below the video
    assert.strictEqual(appendItem(`${video}\n\nAfter`, { text: "First", url: video, videoTime: 5 }), `${video}\n\n- [00:05] First\n\nAfter`)
  })

  it("adds the video with the note below it when the page doesn't have it", () => {
    assert.strictEqual(
      appendItem("Notes", { text: "Line one\nline two", url: "https://youtu.be/xyz", videoTime: 61 }),
      "Notes\n\nhttps://youtu.be/xyz\n\n- [01:01] Line one line two"
    )
  })

  it.effect("files into a page of the map, and says when the page is gone", () =>
    Effect.gen(function*() {
      const path = yield* fileItem(samplePath, id("guards"), { text: "Remember guards run before pipes" })
      assert.isTrue(contentOf(path, "guards").endsWith("\n\nRemember guards run before pipes"))
      const error = yield* Effect.flip(fileItem(samplePath, id("nope"), { text: "x" }))
      assert.strictEqual(error._tag, "PageNotFound")
    }))
})

describe("bringing an item into a page where the cursor is", () => {
  it("is the item as it would be filed", () => {
    assert.strictEqual(itemHere("Anything", { text: "Check the order" }), "Check the order")
    assert.strictEqual(itemHere("", { text: "https://nestjs.com", url: "https://nestjs.com", title: "NestJS" }), "[NestJS](https://nestjs.com)")
  })

  it("is a video moment's note, on one line, when the page has the video", () => {
    assert.strictEqual(itemHere(`Intro\n\n${video}\n\n- [00:10] Start`, { text: "Key idea\nhere", url: `${video}&t=85`, videoTime: 85 }), "- [01:25] Key idea here")
  })

  it("brings the video first when the page doesn't have it", () => {
    assert.strictEqual(itemHere("Notes", { text: video, url: video, title: "A talk", videoTime: 5 }), `${video}\n\n- [00:05] A talk`)
  })
})

describe("making an item a page", () => {
  it("titles it from the link's title or the first line, short and without [[ ]]", () => {
    assert.strictEqual(titleFor({ text: "# [[Pipes]] vs guards\nmore" }), "Pipes vs guards")
    assert.strictEqual(titleFor({ text: "https://x.org", url: "https://x.org", title: "X docs" }), "X docs")
    assert.strictEqual(titleFor({ text: "a".repeat(100) }).length, 80)
    assert.strictEqual(freeTitle(samplePath.pages, "JWT"), "JWT (2)")
    assert.deepStrictEqual(
      ["https://youtu.be/a-1?t=3", "https://m.youtube.com/watch?x=1&v=b_2", "https://www.youtube.com/shorts/c3", "https://notyoutube.com/watch?v=d"].map(youTubeId),
      ["a-1", "b_2", "c3", null]
    )
  })

  it.effect("makes the page and links it from the chosen one", () =>
    Effect.gen(function*() {
      const { path, title } = yield* makePage(samplePath, id("guards"), { text: "JWT\nTokens that sign themselves" }, id("new"))
      assert.strictEqual(title, "JWT (2)")
      assert.strictEqual(contentOf(path, "new"), "JWT\nTokens that sign themselves")
      assert.isTrue(contentOf(path, "guards").endsWith("\n\n[[JWT (2)]]"))
      // The new page hangs from the chosen one on the map
      const tree = mapTree(path)
      assert.strictEqual(tree.nodes.get(id("new"))?.parentId, "guards")
    }))
})
