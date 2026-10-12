import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import {
  PageId,
  Project,
  addChildPage,
  computeLevels,
  deletePage,
  findPageByTitle,
  references,
  renameLinks,
  sampleProject,
  setStartPage
} from "../src/projects/index"

const titleOf = (project: Project, id: PageId) => project.pages.find((p) => p.id === id)?.title

describe("project links and levels", () => {
  it("reads levels top-down from the start page through [[links]]", () => {
    const { levels, apart } = computeLevels(sampleProject)
    const named = levels.map((level) => level.map((id) => titleOf(sampleProject, id)).sort())
    assert.deepStrictEqual(named, [["Variables & Types"], ["Arrays", "Functions"], ["Scope"], ["Closures"]])
    assert.deepStrictEqual(apart, [])
  })

  it("skips links to pages that do not exist", () => {
    const project = { ...sampleProject, pages: sampleProject.pages.map((p) => p.id === "closures" ? { ...p, content: "[[Nowhere]]" } : p) }
    assert.isFalse(references(project).some((r) => r.from === "closures"))
  })

  it("adds a child page by writing its [[link]] into the parent", () => {
    const { project, page } = addChildPage(sampleProject, PageId.make("closures"), "Currying", PageId.make("currying"))
    const closures = project.pages.find((p) => p.id === "closures")!
    assert.strictEqual(page.title, "Currying")
    assert.isTrue(closures.content.endsWith("- [[Currying]]"))
    assert.strictEqual(computeLevels(project).levelOf.get(page.id), 5)
  })

  it("links an existing title instead of creating a duplicate", () => {
    const { project, page } = addChildPage(sampleProject, PageId.make("arrays"), "scope", PageId.make("dup"))
    assert.strictEqual(page.id, "scope")
    assert.strictEqual(project.pages.length, sampleProject.pages.length)
  })

  it("makes the first page the start when there is none", () => {
    const empty = setStartPage({ ...sampleProject, pages: [] }, null)
    const { project, page } = addChildPage(empty, null, "Intro", PageId.make("intro"))
    assert.strictEqual(project.startPageId, page.id)
  })

  it("rewrites [[links]] when a page is renamed, case-insensitively", () => {
    const renamed = renameLinks(sampleProject, "functions", "Functions in depth")
    const start = renamed.pages.find((p) => p.id === "variables")!
    assert.isTrue(start.content.includes("[[Functions in depth]]"))
    assert.isFalse(start.content.includes("[[Functions]]"))
  })

  it("deleting the start page clears it and leaves links to it as missing", () => {
    const project = deletePage(sampleProject, PageId.make("variables"))
    assert.strictEqual(project.startPageId, null)
    assert.isUndefined(findPageByTitle(project.pages, "Variables & Types"))
  })
})

describe("project storage format", () => {
  it.effect("decodes projects saved by earlier versions (extra fields are ignored)", () =>
    Effect.gen(function*() {
      const saved = {
        ...sampleProject,
        connections: [],
        pages: sampleProject.pages.map((p) => ({ ...p, position: { x: 0, y: 0 } }))
      }
      const project = yield* Schema.decodeUnknownEffect(Project)(JSON.parse(JSON.stringify(saved)))
      assert.strictEqual(project.pages.length, 5)
      assert.isFalse("position" in project.pages[0])
    }))
})
