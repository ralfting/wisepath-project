import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import {
  PageId,
  Project,
  ProjectId,
  addModule,
  addTopic,
  crossReferences,
  deletePage,
  findPageByTitle,
  moveTopic,
  newProject,
  nextTopic,
  projectProgress,
  relatedPages,
  renameLinks,
  roleOf,
  sampleProject,
  structureOf,
  updatePage
} from "../src/projects/index"

const id = PageId.make
const titleOf = (project: Project, pageId: PageId) => project.pages.find((p) => p.id === pageId)?.title

describe("project structure", () => {
  it("reads root, modules and topics from each page's parent", () => {
    const { root, modules } = structureOf(sampleProject)
    assert.strictEqual(root.title, "NestJS")
    assert.strictEqual(modules.length, 8)
    assert.deepStrictEqual(modules[2].topics.map((t) => t.title), ["What providers are", "Custom providers", "Scopes", "Factory providers"])
    assert.strictEqual(roleOf(sampleProject, id("providers")), "module")
    assert.strictEqual(roleOf(sampleProject, id("jwt")), "topic")
  })

  it("counts progress over topics and finds the next one to study", () => {
    assert.deepStrictEqual(projectProgress(sampleProject), { studied: 7, total: 31 })
    assert.strictEqual(nextTopic(sampleProject)?.title, "Module system")
  })

  it("lists a page's related pages: parent, children, then links both ways", () => {
    const related = relatedPages(sampleProject, id("providers")).map((r) => `${r.relation}:${r.page.title}`)
    assert.deepStrictEqual(related, [
      "parent:NestJS",
      "child:What providers are",
      "child:Custom providers",
      "child:Scopes",
      "child:Factory providers",
      "linksTo:Dependency Injection",
      "linksTo:JWT"
    ])
    assert.deepStrictEqual(relatedPages(sampleProject, id("jwt")).map((r) => r.relation), ["parent", "linkedFrom"])
  })

  it("draws cross references only between pages that are not parent and child", () => {
    const named = crossReferences(sampleProject).map((r) => `${titleOf(sampleProject, r.from)} > ${titleOf(sampleProject, r.to)}`)
    assert.deepStrictEqual(named.sort(), ["Providers > Dependency Injection", "Providers > JWT"])
  })
})

describe("project rules", () => {
  it("starts a new project with just its root, named like the map", () => {
    const project = newProject(ProjectId.make("p"), " Rust ", id("rust"))
    assert.strictEqual(project.title, "Rust")
    assert.strictEqual(structureOf(project).root.id, "rust")
    assert.strictEqual(structureOf(project).modules.length, 0)
  })

  it("adds modules with rotating colours and topics under them", () => {
    let project = newProject(ProjectId.make("p"), "Rust", id("rust"))
    project = addModule(project, "Ownership", id("own")).project
    project = addModule(project, "Traits", id("traits")).project
    project = addTopic(project, id("own"), "Borrowing", id("borrow")).project
    const { modules } = structureOf(project)
    assert.notStrictEqual(modules[0].page.color, modules[1].page.color)
    assert.deepStrictEqual(modules[0].topics.map((t) => t.title), ["Borrowing"])
  })

  it("puts a page added from a topic in the topic's module, and from the root as a module", () => {
    const fromTopic = addTopic(sampleProject, id("guards"), "Strategies", id("strategies"))
    assert.strictEqual(fromTopic.page.parentId, "authentication")
    const fromRoot = addTopic(sampleProject, sampleProject.rootPageId, "GraphQL", id("graphql"))
    assert.strictEqual(roleOf(fromRoot.project, id("graphql")), "module")
  })

  it("returns the existing page instead of duplicating a title", () => {
    const { project, page } = addTopic(sampleProject, id("testing"), "jwt", id("dup"))
    assert.strictEqual(page.id, "jwt")
    assert.strictEqual(project.pages.length, sampleProject.pages.length)
  })

  it("renaming the root renames the map", () => {
    assert.strictEqual(updatePage(sampleProject, sampleProject.rootPageId, { title: "Nest" }).title, "Nest")
  })

  it("moves a topic between modules", () => {
    const project = moveTopic(sampleProject, id("jwt"), id("providers"))
    assert.isTrue(structureOf(project).modules[2].topics.some((t) => t.id === "jwt"))
    assert.strictEqual(moveTopic(sampleProject, id("providers"), id("testing")), sampleProject)
  })

  it("deleting a module takes its topics; the root can't be deleted", () => {
    const project = deletePage(sampleProject, id("testing"))
    assert.isUndefined(findPageByTitle(project.pages, "Unit tests"))
    assert.strictEqual(project.pages.length, sampleProject.pages.length - 5)
    assert.strictEqual(deletePage(sampleProject, sampleProject.rootPageId), sampleProject)
  })

  it("rewrites [[links]] when a page is renamed, case-insensitively", () => {
    const renamed = renameLinks(sampleProject, "jwt", "JSON Web Tokens")
    const providers = renamed.pages.find((p) => p.id === "providers")!
    assert.isTrue(providers.content.includes("[[JSON Web Tokens]]"))
  })
})

describe("project storage format", () => {
  it.effect("round-trips through the schema", () =>
    Effect.gen(function*() {
      const project = yield* Schema.decodeUnknownEffect(Project)(JSON.parse(JSON.stringify(sampleProject)))
      assert.strictEqual(project.pages.length, 40)
      assert.strictEqual(project.pages[1].icon, "book")
    }))
})
