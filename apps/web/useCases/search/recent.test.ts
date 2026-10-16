import { describe, expect, it } from "vitest"
import { parseRecent, rememberOpened } from "./recent"

const page = (pageId: string, title = pageId) => ({ pathId: "p1", pageId, title, pathTitle: "NestJS" })

describe("recent pages", () => {
  it("puts the page opened at the top, once, keeping the newest few", () => {
    let list = rememberOpened([], page("a"), 1)
    list = rememberOpened(list, page("b"), 2)
    list = rememberOpened(list, page("a", "A renamed"), 3)
    expect(list.map((p) => [p.pageId, p.title, p.openedAt])).toEqual([
      ["a", "A renamed", 3],
      ["b", "b", 2]
    ])

    const full = ["c", "d", "e"].reduce((l, id, i) => rememberOpened(l, page(id), 10 + i, 3), list)
    expect(full.map((p) => p.pageId)).toEqual(["e", "d", "c"])
  })

  it("tells the same page id in another path apart", () => {
    const list = rememberOpened(rememberOpened([], page("a"), 1), { ...page("a"), pathId: "p2" }, 2)
    expect(list).toHaveLength(2)
  })

  it("reads back only what looks right", () => {
    const good = rememberOpened([], page("a"), 1)
    expect(parseRecent(JSON.stringify(good))).toEqual(good)
    expect(parseRecent(JSON.stringify([{ pageId: "x" }, ...good, null]))).toEqual(good)
    expect(parseRecent("not json")).toEqual([])
    expect(parseRecent(JSON.stringify({ a: 1 }))).toEqual([])
    expect(parseRecent(null)).toEqual([])
  })
})
