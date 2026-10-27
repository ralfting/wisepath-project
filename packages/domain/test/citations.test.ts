import { assert, describe, it } from "@effect/vitest"
import {
  PageId,
  PathId,
  citingPages,
  connectionsOf,
  linksOf,
  mapTree,
  moveBranch,
  pendingTitles,
  references,
  relatedPages,
  renameLinks,
  unlinkPages
} from "../src/paths/index"
import type { Path } from "../src/paths/index"

const id = PageId.make

/** A small path: pages and their text, the first one is the root */
function path(spec: Record<string, string>): Path {
  const entries = Object.entries(spec)
  return {
    id: PathId.make("p"),
    title: entries[0][0],
    kind: "study",
    pages: entries.map(([title, content]) => ({ id: id(title.toLowerCase()), title, content, studied: false, updatedAt: "" })),
    rootPageId: id(entries[0][0].toLowerCase()),
    visibility: "private",
    access: "owner"
  }
}

const contentOf = (p: Path, pageId: string) => p.pages.find((page) => page.id === pageId)?.content

describe("references in a page's text", () => {
  it("reads [[links]] and @[[citations]] in order, skipping code and an @ that does not touch the brackets", () => {
    const text = "See @[[Market]], then [[Pricing]]. Mail me@x.com or @ [[Sales]]. `@[[Code]]`\n```\n[[Fenced]]\n```"
    assert.deepStrictEqual(references(text), [
      { title: "Market", kind: "citation" },
      { title: "Pricing", kind: "link" },
      { title: "Sales", kind: "link" }
    ])
  })

  it("counts a page both linked and cited once, as a link, from where it is linked", () => {
    const p = path({ Root: "@[[B]] then [[A]], [[B]] and @[[C]] @[[c]]", A: "", B: "", C: "" })
    assert.deepStrictEqual(connectionsOf(p, id("root")), [
      { to: id("a"), kind: "link" },
      { to: id("b"), kind: "link" },
      { to: id("c"), kind: "citation" }
    ])
    assert.deepStrictEqual(linksOf(p, id("root")), [id("a"), id("b")])
  })

  it("does not list a cited page no page has as one to make", () => {
    const p = path({ Root: "@[[Someday]] and [[Soon]]" })
    assert.deepStrictEqual(pendingTitles(p, id("root")), ["Soon"])
  })
})

describe("citations on the map", () => {
  it("never places a page: one cited before it is linked keeps its linked place", () => {
    const p = path({ Root: "As we saw in @[[Market]], start with [[Basics]]", Basics: "[[Market]]", Market: "" })
    const tree = mapTree(p)
    assert.strictEqual(tree.nodes.get(id("market"))?.parentId, "basics")
    assert.deepStrictEqual(tree.citations, [{ from: id("root"), to: id("market") }])
    assert.deepStrictEqual(tree.arrows, [])
  })

  it("leaves a page only cited off the map, unlinked, with the pages that cite it", () => {
    const p = path({ Root: "[[A]] and @[[Aside]]", A: "@[[Aside]]", Aside: "" })
    const tree = mapTree(p)
    assert.deepStrictEqual(tree.orphans.map((o) => o.title), ["Aside"])
    assert.deepStrictEqual(tree.citations, [])
    assert.deepStrictEqual(citingPages(p, id("aside")).map((o) => o.title), ["Root", "A"])
  })

  it("draws one citation per pair, none where a link already joins the two pages", () => {
    const p = path({ Root: "[[A]] @[[A]]", A: "[[B]]", B: "@[[A]] @[[a]]" })
    assert.deepStrictEqual(mapTree(p).citations, [])
    const q = path({ Root: "[[A]] [[B]]", A: "[[C]]", B: "@[[A]] @[[C]]", C: "@[[B]]" })
    assert.deepStrictEqual(mapTree(q).citations, [{ from: id("b"), to: id("a") }, { from: id("b"), to: id("c") }])
  })

  it("lists cited pages in Related under their strongest relation", () => {
    const p = path({ Root: "[[A]] [[B]] [[C]]", A: "@[[B]] @[[C]] [[C]]", B: "@[[A]]", C: "" })
    const related = (pageId: string) => relatedPages(p, id(pageId)).map((r) => `${r.relation}:${r.page.title}`)
    assert.deepStrictEqual(related("a"), ["parent:Root", "linksTo:C", "cites:B"])
    assert.deepStrictEqual(related("b"), ["parent:Root", "cites:A"])
    assert.deepStrictEqual(related("c"), ["parent:Root", "linkedFrom:A"])
  })
})

describe("renaming and deleting a cited page", () => {
  it("keeps the @ of a citation when its page is renamed", () => {
    const p = path({ Root: "@[[market]] and [[Market ]]", Market: "" })
    assert.strictEqual(contentOf(renameLinks(p, "Market", "Markets"), "root"), "@[[Markets]] and [[Markets]]")
  })

  it("drops the @ with the brackets when its page is deleted", () => {
    const p = path({ Root: "As in @[[Market]], see [[Market]].", Market: "" })
    assert.deepStrictEqual(unlinkPages(p, "Market").map((page) => page.content), ["As in Market, see Market."])
  })

  it("moves a page's link to another branch without touching a citation of it", () => {
    const p = path({ Root: "[[A]] [[B]]", A: "[[X]] and @[[X]]", B: "", X: "" })
    const moved = moveBranch(p, id("x"), id("b"))
    assert.strictEqual(contentOf(moved, "a"), "X and @[[X]]")
    assert.strictEqual(mapTree(moved).nodes.get(id("x"))?.parentId, "b")
  })
})
