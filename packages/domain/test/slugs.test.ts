import { assert, describe, it } from "@effect/vitest"
import { PageId, PathId, freeSlug, pageSlugs, slugOf } from "../src/paths/index"
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
})
