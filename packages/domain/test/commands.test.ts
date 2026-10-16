import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import {
  NewPath,
  PageEdit,
  PageId,
  PathId,
  addBranch,
  addPage,
  copyPath,
  editPage,
  editPath,
  mapTree,
  removePage,
  samplePath,
  startPath,
  summarize
} from "../src/paths/index"

const id = PageId.make
const rootId = samplePath.rootPageId
const titleOf = (path: typeof samplePath, pageId: string) => path.pages.find((p) => p.id === pageId)?.title

describe("page commands", () => {
  it.effect("adds a branch: a new page and a [[link]] at the end of its parent", () =>
    Effect.gen(function*() {
      const before = samplePath.pages.find((p) => p.id === "guards")!.content
      const { path, page, created } = yield* addBranch(samplePath, id("guards"), "  Guard order ", id("new"))
      assert.isTrue(created)
      assert.strictEqual(page?.title, "Guard order")
      const parent = path.pages.find((p) => p.id === "guards")!.content
      assert.strictEqual(parent, `${before.trimEnd()}\n\n[[Guard order]]`)
      assert.strictEqual(mapTree(path).nodes.get(id("new"))?.parentId, "guards")
    }))

  it.effect("links the page a taken name belongs to instead of making a second one", () =>
    Effect.gen(function*() {
      const { path, page, created } = yield* addBranch(samplePath, id("guards"), "jwt", id("new"))
      assert.isFalse(created)
      assert.strictEqual(page?.id, "jwt")
      assert.strictEqual(path.pages.length, samplePath.pages.length)
      assert.include(path.pages.find((p) => p.id === "guards")!.content, "[[JWT]]")
    }))

  it.effect("changes nothing for a blank name, the parent's own name, or a page it links already", () =>
    Effect.gen(function*() {
      assert.strictEqual((yield* addBranch(samplePath, id("guards"), "   ", id("new"))).path, samplePath)
      const self = samplePath.pages.find((p) => p.id === "guards")!.title
      assert.strictEqual((yield* addBranch(samplePath, id("guards"), self, id("new"))).path, samplePath)
      const linked = (yield* addBranch(samplePath, id("guards"), "JWT", id("new"))).path
      assert.strictEqual((yield* addBranch(linked, id("guards"), "JWT", id("new2"))).path, linked)
    }))

  it.effect("adds a page once, even when the command is sent twice", () =>
    Effect.gen(function*() {
      const { path } = yield* addPage(samplePath, { id: id("new"), title: "Interceptors 2" })
      const again = yield* addPage(path, { id: id("new"), title: "Interceptors 2" })
      assert.strictEqual(again.path, path)
      assert.strictEqual(path.pages.length, samplePath.pages.length + 1)
    }))

  it.effect("refuses a title another page has", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(addPage(samplePath, { id: id("new"), title: " jwt " }))
      assert.strictEqual(error._tag, "TitleTaken")
      const renamed = yield* Effect.flip(editPage(samplePath, id("guards"), { title: "JWT" }))
      assert.strictEqual(renamed._tag, "TitleTaken")
    }))

  it.effect("renames a page and moves the [[links]] that used its old title", () =>
    Effect.gen(function*() {
      const p = yield* editPage(samplePath, id("jwt"), { title: "JSON Web Tokens", previousTitle: "JWT" })
      assert.strictEqual(titleOf(p, "jwt"), "JSON Web Tokens")
      assert.isTrue(p.pages.some((page) => page.content.includes("[[JSON Web Tokens]]")))
      assert.isFalse(p.pages.some((page) => page.content.includes("[[JWT]]")))
    }))

  it.effect("edits the look and the text in one command", () =>
    Effect.gen(function*() {
      const p = yield* editPage(samplePath, id("guards"), { content: "Hi", module: true, color: "green" })
      const page = p.pages.find((x) => x.id === "guards")!
      assert.deepStrictEqual([page.content, page.module, page.color], ["Hi", true, "green"])
    }))

  it.effect("protects the root and reports pages that are gone", () =>
    Effect.gen(function*() {
      assert.strictEqual((yield* Effect.flip(editPage(samplePath, rootId, { studied: true })))._tag, "RootPageProtected")
      assert.strictEqual((yield* Effect.flip(removePage(samplePath, rootId)))._tag, "RootPageProtected")
      assert.strictEqual((yield* Effect.flip(editPage(samplePath, id("nope"), { content: "" })))._tag, "PageNotFound")
      // Deleting twice is fine: the second time there is nothing left to do
      const once = yield* removePage(samplePath, id("jwt"))
      assert.strictEqual(yield* removePage(once, id("jwt")), once)
    }))

  it("validates commands at the boundary", () => {
    assert.isTrue(Schema.is(PageEdit)({ studied: true }))
    assert.isFalse(Schema.is(PageEdit)({ color: "plaid" }))
    assert.isFalse(Schema.is(NewPath)({ id: "p", rootPageId: "r", title: "" }))
  })
})

describe("paths", () => {
  it("starts a map with its root page", () => {
    const p = startPath({ id: PathId.make("p"), rootPageId: id("r"), title: " Rust " })
    assert.deepStrictEqual([p.title, p.pages.length, p.rootPageId], ["Rust", 1, "r"])
  })

  it("summarizes a map for its card", () => {
    const s = summarize(editPath(samplePath, { kind: "learningPath" }))
    assert.deepStrictEqual([s.kind, s.studied, s.total, s.modules, s.orphans, s.next?.title, s.color], ["learningPath", 8, 41, 8, 0, "Modules", "red"])
  })

  it("copies the sample with fresh ids and the same map", () => {
    let n = 0
    const copy = copyPath(samplePath, PathId.make("mine"), () => id(`p${n++}`))
    assert.strictEqual(copy.id, "mine")
    assert.isFalse(copy.pages.some((p) => samplePath.pages.some((s) => s.id === p.id)))
    assert.strictEqual(copy.kind, "study")
    assert.deepStrictEqual(mapTree(copy).root.children.length, mapTree(samplePath).root.children.length)
  })
})
