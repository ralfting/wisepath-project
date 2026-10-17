import { assert, describe, it } from "@effect/vitest"
import { ProjectId } from "../src/projects"
import { Effect, Schema } from "effect"
import {
  PageId,
  Path,
  editPath,
  startPath,
  summarize,
  PathId,
  branchProgress,
  createPage,
  deletePage,
  findPageByTitle,
  lookOf,
  mapTree,
  newPath,
  nextPage,
  trailTo,
  pathProgress,
  relatedPages,
  renameLinks,
  samplePath,
  setLook,
  titleTaken,
  unlinkPages,
  updatePage
} from "../src/paths/index"

const id = PageId.make
const titles = (path: Path, ids: ReadonlyArray<PageId>) => ids.map((i) => path.pages.find((p) => p.id === i)?.title)

/** A small path: pages and their text, the first one is the root */
function path(spec: Record<string, string>): Path {
  const entries = Object.entries(spec)
  return {
    id: PathId.make("p"),
    title: entries[0][0],
    kind: "learningPath",
    pages: entries.map(([title, content]) => ({ id: id(title.toLowerCase()), title, content, studied: false, updatedAt: "" })),
    rootPageId: id(entries[0][0].toLowerCase()),
    visibility: "private",
    access: "owner"
  }
}

describe("map tree", () => {
  it("reads branches from the root through [[links]], in link order", () => {
    const tree = mapTree(samplePath)
    assert.deepStrictEqual(tree.root.children.map((c) => c.page.title), [
      "Fundamentals", "Modules", "Providers", "Database", "Advanced", "Authentication", "Requests", "Testing"
    ])
    assert.strictEqual(tree.nodes.get(id("refresh-tokens"))?.depth, 3)
    assert.strictEqual(tree.orphans.length, 0)
  })

  it("gives a page to the first link that reaches it; later links become arrows", () => {
    const tree = mapTree(samplePath)
    assert.strictEqual(tree.nodes.get(id("dependency-injection"))?.parentId, "modules")
    assert.strictEqual(tree.nodes.get(id("jwt"))?.parentId, "authentication")
    const arrows = tree.arrows.map((a) => `${a.from} > ${a.to}`).sort()
    assert.deepStrictEqual(arrows, ["custom-providers > jwt", "providers > dependency-injection"])
  })

  it("does not draw arrows back to the root or to a page's own ancestors", () => {
    const p = path({ Root: "[[A]]", A: "[[B]]", B: "[[A]] [[Root]] [[C]]", C: "[[A]]" })
    assert.deepStrictEqual(mapTree(p).arrows, [])
  })

  it("ties go to the page reached first, then to the first link in its text", () => {
    const p = path({ Root: "[[A]] [[B]]", A: "[[X]]", B: "[[X]]", X: "" })
    assert.strictEqual(mapTree(p).nodes.get(id("x"))?.parentId, "a")
    assert.deepStrictEqual(mapTree(p).arrows, [{ from: id("b"), to: id("x") }])
  })

  it("puts pages no link reaches with the orphans, cycles included", () => {
    const p = path({ Root: "[[A]]", A: "", Zed: "[[Lone]]", Lone: "[[Zed]]" })
    assert.deepStrictEqual(mapTree(p).orphans.map((o) => o.title), ["Lone", "Zed"])
  })

  it("lists related pages: branch parent, branches, then links both ways", () => {
    const related = relatedPages(samplePath, id("providers")).map((r) => `${r.relation}:${r.page.title}`)
    assert.deepStrictEqual(related, [
      "parent:NestJS",
      "child:What providers are",
      "child:Custom providers",
      "child:Scopes",
      "child:Factory providers",
      "linksTo:Dependency Injection"
    ])
    assert.deepStrictEqual(trailTo(samplePath, id("refresh-tokens")).map((p) => p.title), ["NestJS", "Authentication", "JWT", "Refresh tokens"])
  })
})

describe("progress and looks", () => {
  it("counts the pages below a page, and the whole map at the root", () => {
    assert.deepStrictEqual(pathProgress(samplePath), { studied: 8, total: 41 })
    assert.deepStrictEqual(branchProgress(samplePath, id("authentication")), { studied: 0, total: 5 })
    assert.deepStrictEqual(branchProgress(samplePath, id("guards")), { studied: 0, total: 0 })
    assert.strictEqual(nextPage(samplePath)?.title, "Modules")
  })

  it("takes the colour of the nearest module above; any page can be a module", () => {
    assert.strictEqual(lookOf(samplePath, id("refresh-tokens")).color, "indigo")
    const styled = setLook(samplePath, id("jwt"), { module: true, color: "green", icon: "lock" })
    assert.strictEqual(lookOf(styled, id("refresh-tokens")).color, "green")
    assert.strictEqual(lookOf(styled, id("jwt")).icon, "lock")
  })
})

describe("path rules", () => {
  it("starts a new path with just its root, named like the map", () => {
    const p = newPath(PathId.make("p"), " Rust ", id("rust"))
    assert.strictEqual(p.title, "Rust")
    assert.strictEqual(mapTree(p).root.children.length, 0)
  })

  it("starts a study unless told otherwise; a study has nothing to continue", () => {
    const study = startPath({ projectId: ProjectId.make("general"), id: PathId.make("s"), rootPageId: id("s"), title: "Notes" })
    assert.strictEqual(study.kind, "study")
    const course = startPath({ projectId: ProjectId.make("general"), id: PathId.make("c"), rootPageId: id("c"), title: "Course", kind: "learningPath" })
    assert.strictEqual(course.kind, "learningPath")
    assert.isNull(summarize(samplePath, ProjectId.make("general"), null).next)
    assert.strictEqual(summarize(editPath(samplePath, { kind: "learningPath" }), ProjectId.make("general"), null).next?.title, "Modules")
  })

  it("keeps the studied marks when a map switches kind, so they come back with the progress", () => {
    const course = editPath(samplePath, { kind: "learningPath" })
    const study = editPath(course, { kind: "study" })
    assert.deepStrictEqual(pathProgress(editPath(study, { kind: "learningPath" })), pathProgress(course))
    assert.strictEqual(editPath(study, { description: "x" }).kind, "study")
  })

  it("creates the page a [[link]] points to, which the link then connects", () => {
    const linked = updatePage(samplePath, id("guards"), { content: "See [[Strategies]]" })
    const { path: next, page } = createPage(linked, "Strategies", id("strategies"))
    assert.strictEqual(mapTree(next).nodes.get(page.id)?.parentId, "guards")
    assert.strictEqual(createPage(next, "jwt", id("dup")).page.id, "jwt")
  })

  it("refuses a title another page has, and never marks the root studied", () => {
    assert.isTrue(titleTaken(samplePath, id("guards"), " jwt "))
    assert.strictEqual(updatePage(samplePath, id("guards"), { title: "JWT" }), samplePath)
    assert.strictEqual(updatePage(samplePath, samplePath.rootPageId, { studied: true }), samplePath)
    assert.strictEqual(updatePage(samplePath, samplePath.rootPageId, { title: "Nest" }).title, "Nest")
  })

  it("deleting a page leaves the pages only it reached as orphans; the root stays", () => {
    const p = deletePage(samplePath, id("jwt"))
    assert.isUndefined(findPageByTitle(p.pages, "JWT"))
    assert.deepStrictEqual(mapTree(p).orphans.map((o) => o.title), ["Refresh tokens"])
    assert.strictEqual(deletePage(samplePath, samplePath.rootPageId), samplePath)
  })

  it("rewrites [[links]] when a page is renamed, case-insensitively", () => {
    const renamed = renameLinks(samplePath, "jwt", "JSON Web Tokens")
    const authentication = renamed.pages.find((p) => p.id === "authentication")!
    assert.isTrue(authentication.content.includes("[[JSON Web Tokens]]"))
    assert.deepStrictEqual(titles(renamed, mapTree(renamed).root.children.map((c) => c.page.id)).length, 8)
  })

  it("turns links to a page into plain text, for a page about to be deleted", () => {
    const p = path({ Root: "Start with [[Basics]] and [[basics ]].", Basics: "", Other: "Nothing here" })
    const changed = unlinkPages(p, "Basics")
    assert.deepStrictEqual(changed.map((page) => page.content), ["Start with Basics and Basics."])
    assert.deepStrictEqual(unlinkPages(p, "Missing"), [])
  })
})

describe("path storage format", () => {
  it.effect("round-trips through the schema", () =>
    Effect.gen(function*() {
      const p = yield* Schema.decodeUnknownEffect(Path)(JSON.parse(JSON.stringify(samplePath)))
      assert.strictEqual(p.pages.length, 42)
      assert.isTrue(p.pages[1].module)
    }))
})
