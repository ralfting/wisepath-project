import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import {
  NewProject,
  PageEdit,
  PageId,
  ProjectId,
  addPage,
  copyProject,
  editPage,
  removePage,
  sampleProject,
  startProject,
  summarize
} from "../src/projects/index"

const id = PageId.make
const rootId = sampleProject.rootPageId
const titleOf = (project: typeof sampleProject, pageId: string) => project.pages.find((p) => p.id === pageId)?.title

describe("page commands", () => {
  it.effect("adds a page once, even when the command is sent twice", () =>
    Effect.gen(function*() {
      const { project } = yield* addPage(sampleProject, { id: id("new"), title: "Interceptors 2" })
      const again = yield* addPage(project, { id: id("new"), title: "Interceptors 2" })
      assert.strictEqual(again.project, project)
      assert.strictEqual(project.pages.length, sampleProject.pages.length + 1)
    }))

  it.effect("refuses a title another page has", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(addPage(sampleProject, { id: id("new"), title: " jwt " }))
      assert.strictEqual(error._tag, "TitleTaken")
      const renamed = yield* Effect.flip(editPage(sampleProject, id("guards"), { title: "JWT" }))
      assert.strictEqual(renamed._tag, "TitleTaken")
    }))

  it.effect("renames a page and moves the [[links]] that used its old title", () =>
    Effect.gen(function*() {
      const p = yield* editPage(sampleProject, id("jwt"), { title: "JSON Web Tokens", previousTitle: "JWT" })
      assert.strictEqual(titleOf(p, "jwt"), "JSON Web Tokens")
      assert.isTrue(p.pages.some((page) => page.content.includes("[[JSON Web Tokens]]")))
      assert.isFalse(p.pages.some((page) => page.content.includes("[[JWT]]")))
    }))

  it.effect("edits the look and the text in one command", () =>
    Effect.gen(function*() {
      const p = yield* editPage(sampleProject, id("guards"), { content: "Hi", module: true, color: "green" })
      const page = p.pages.find((x) => x.id === "guards")!
      assert.deepStrictEqual([page.content, page.module, page.color], ["Hi", true, "green"])
    }))

  it.effect("protects the root and reports pages that are gone", () =>
    Effect.gen(function*() {
      assert.strictEqual((yield* Effect.flip(editPage(sampleProject, rootId, { studied: true })))._tag, "RootPageProtected")
      assert.strictEqual((yield* Effect.flip(removePage(sampleProject, rootId)))._tag, "RootPageProtected")
      assert.strictEqual((yield* Effect.flip(editPage(sampleProject, id("nope"), { content: "" })))._tag, "PageNotFound")
      // Deleting twice is fine: the second time there is nothing left to do
      const once = yield* removePage(sampleProject, id("jwt"))
      assert.strictEqual(yield* removePage(once, id("jwt")), once)
    }))

  it("validates commands at the boundary", () => {
    assert.isTrue(Schema.is(PageEdit)({ studied: true }))
    assert.isFalse(Schema.is(PageEdit)({ color: "plaid" }))
    assert.isFalse(Schema.is(NewProject)({ id: "p", rootPageId: "r", title: "" }))
  })
})

describe("projects", () => {
  it("starts a map with its root page", () => {
    const p = startProject({ id: ProjectId.make("p"), rootPageId: id("r"), title: " Rust " })
    assert.deepStrictEqual([p.title, p.pages.length, p.rootPageId], ["Rust", 1, "r"])
  })

  it("summarizes a map for its card", () => {
    const s = summarize(sampleProject)
    assert.deepStrictEqual([s.studied, s.total, s.modules, s.orphans, s.next?.title, s.color], [8, 41, 8, 0, "Modules", "red"])
  })

  it("copies the sample with fresh ids and the same map", () => {
    let n = 0
    const copy = copyProject(sampleProject, ProjectId.make("mine"), () => id(`p${n++}`))
    assert.strictEqual(copy.id, "mine")
    assert.isFalse(copy.pages.some((p) => sampleProject.pages.some((s) => s.id === p.id)))
    assert.deepStrictEqual(summarize(copy).next?.title, "Modules")
  })
})
