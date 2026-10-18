import { assert, describe, it } from "@effect/vitest"
import { literatureSample, mapTree, pendingTitles } from "../src/paths/index"

describe("the literature sample", () => {
  it("is a whole learning path in each language: every link leads to a page, none left off the map, none studied", () => {
    const shapes = (["en", "pt-BR"] as const).map((locale) => {
      const path = literatureSample(locale)
      const tree = mapTree(path)
      return {
        kind: path.kind,
        pages: path.pages.length,
        modules: path.pages.filter((p) => p.module).length,
        pending: path.pages.flatMap((p) => pendingTitles(path, p.id)),
        orphans: tree.orphans.length,
        studied: path.pages.filter((p) => p.studied).length
      }
    })
    const expected = { kind: "learningPath", pages: 13, modules: 3, pending: [], orphans: 0, studied: 0 }
    assert.deepStrictEqual(shapes, [expected, expected])
  })

  it("says it is a sample, in the learner's language", () => {
    assert.deepStrictEqual(
      [literatureSample("en").title, literatureSample("pt-BR").title],
      ["Literature (sample)", "Literatura (exemplo)"]
    )
  })
})
