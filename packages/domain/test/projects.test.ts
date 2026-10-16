import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { NewProject, ProjectId, defaultProjectName, sortProjects } from "../src/projects"

const project = (name: string, isDefault = false) => ({ id: ProjectId.make(name), name, isDefault })

describe("projects", () => {
  it("lists the default project first, then the others by name", () => {
    const sorted = sortProjects([project("work"), project("Languages"), project("Geral", true), project("art")])
    assert.deepStrictEqual(sorted.map((p) => p.name), ["Geral", "art", "Languages", "work"])
  })

  it("names the default project in the account's language", () => {
    assert.strictEqual(defaultProjectName("pt-BR"), "Geral")
    assert.strictEqual(defaultProjectName("en"), "General")
    assert.strictEqual(defaultProjectName(null), "General")
  })

  it("trims a new project's name and refuses an empty one", () => {
    const decode = Schema.decodeUnknownSync(NewProject)
    assert.strictEqual(decode({ id: "p", name: "  Work " }).name, "Work")
    assert.throws(() => decode({ id: "p", name: "   " }))
  })
})
