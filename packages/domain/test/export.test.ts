import { assert, describe, it } from "@effect/vitest"
import { PageId, PathId, exportFolders, fileName, markdownFiles } from "../src/paths/index"
import type { Path } from "../src/paths/index"

/** A small path: pages and their text, the first one is the root */
function path(title: string, spec: Record<string, string>): Path {
  const entries = Object.entries(spec)
  return {
    id: PathId.make(title.toLowerCase()),
    title,
    kind: "study",
    pages: entries.map(([pageTitle, content], index) => ({
      id: PageId.make(`page-${index}`),
      title: pageTitle,
      content,
      studied: false,
      updatedAt: ""
    })),
    rootPageId: PageId.make("page-0"),
    visibility: "private",
    access: "owner"
  }
}

describe("download as Markdown", () => {
  it("gives one file per page, named after its title, with the text exactly as written", () => {
    const react = path("React", { React: "Start with [[Hooks]].", Hooks: "## useState\n[02:15] the setter" })
    assert.deepStrictEqual(markdownFiles(react), [
      { name: "React.md", content: "Start with [[Hooks]]." },
      { name: "Hooks.md", content: "## useState\n[02:15] the setter" }
    ])
  })

  it("turns a title into a name every system accepts, and keeps two names from colliding", () => {
    assert.strictEqual(fileName('Testing: what/why? "<user>"', "x"), 'Testing- what-why- --user--')
    assert.strictEqual(fileName("Etc. ", "x"), "Etc")
    assert.strictEqual(fileName("???", "page-1"), "---")
    assert.strictEqual(fileName(" .. ", "page-1"), "page-1")
    assert.strictEqual(fileName("a".repeat(300), "x").length, 120)

    const clash = path("Root", { Root: "", "A/B": "", "A:B": "", "a-b": "" })
    assert.deepStrictEqual(markdownFiles(clash).map((f) => f.name), ["Root.md", "A-B.md", "A-B (2).md", "a-b (3).md"])
  })

  it("puts each path in a folder of its own", () => {
    const files = exportFolders([path("React", { React: "", Hooks: "" }), path("react", { react: "" })])
    assert.deepStrictEqual(files.map((f) => f.name), ["React/React.md", "React/Hooks.md", "react (2)/react.md"])
  })
})
