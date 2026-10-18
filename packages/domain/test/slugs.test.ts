import { assert, describe, it } from "@effect/vitest"
import { PageId, PathId, catalogEntry, freeSlug, pageAt, pageSlugs, slugOf } from "../src/paths/index"
import type { Path } from "../src/paths/index"

const path = (titles: ReadonlyArray<string>): Path => ({
  id: PathId.make("p"),
  title: titles[0],
  kind: "study",
  pages: titles.map((title, index) => ({ id: PageId.make(`page-${index}`), title, content: "", studied: false, updatedAt: "" })),
  rootPageId: PageId.make("page-0"),
  visibility: "published",
  access: "viewer"
})

describe("addresses of published paths", () => {
  it("makes a title readable in an address: lower case, no accents, words joined", () => {
    assert.strictEqual(slugOf("Testes em React: o básico!"), "testes-em-react-o-basico")
    assert.strictEqual(slugOf("  user-event  "), "user-event")
    assert.strictEqual(slugOf("Ação & Reação"), "acao-reacao")
    assert.strictEqual(slugOf("???"), "")
    assert.strictEqual(slugOf("a".repeat(200)).length, 80)
  })

  it("keeps a slug free of those taken, and stands in for an empty one", () => {
    assert.strictEqual(freeSlug("react", new Set()), "react")
    assert.strictEqual(freeSlug("react", new Set(["react", "react-2"])), "react-3")
    assert.strictEqual(freeSlug("", new Set()), "page")
  })

  it("gives each page but the root its own address, in page order", () => {
    const slugs = pageSlugs(path(["React", "Hooks", "hooks!", "???", "Testes"]))
    assert.deepStrictEqual([...slugs.entries()], [
      [PageId.make("page-1"), "hooks"],
      [PageId.make("page-2"), "hooks-2"],
      [PageId.make("page-3"), "page"],
      [PageId.make("page-4"), "testes"]
    ])
  })

  it("finds the page at an address: the root without one, none for an unknown one", () => {
    const p = path(["React", "Hooks"])
    assert.strictEqual(pageAt(p, null)?.title, "React")
    assert.strictEqual(pageAt(p, "hooks")?.title, "Hooks")
    assert.isUndefined(pageAt(p, "react"))
  })

  it("lists a published path for the sitemap: its address, its pages', and when each last changed", () => {
    const p = { ...path(["React", "Hooks"]), slug: "react" }
    const dated = { ...p, pages: p.pages.map((page, index) => ({ ...page, updatedAt: `2026-10-0${index + 1}T00:00:00.000Z` })) }
    assert.deepStrictEqual(catalogEntry(dated), {
      slug: "react",
      updatedAt: "2026-10-02T00:00:00.000Z",
      pages: [{ slug: "hooks", updatedAt: "2026-10-02T00:00:00.000Z" }]
    })
    assert.isNull(catalogEntry(path(["React"])))
  })
})
