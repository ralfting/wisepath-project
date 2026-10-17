import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { ProjectId } from "@wisepath/domain/projects"
import { MemoryProjectRepository, aProject } from "@/infrastructure/projects/MemoryProjectRepository"
import * as programs from "./programs"

const general = aProject({ name: "General", isDefault: true })
const work = aProject({ name: "Work" })

describe("project use cases", () => {
  it.effect("creates a project with its name trimmed and lists the default first", () =>
    Effect.gen(function*() {
      const created = yield* programs.createProject("  Languages ")
      const names = (yield* programs.listProjects).map((p) => p.name)
      assert.strictEqual(created.name, "Languages")
      assert.deepStrictEqual(names, ["General", "Languages", "Work"])
    }).pipe(Effect.provide(MemoryProjectRepository([work, general]))))

  it.effect("renames a project, and refuses one that is gone", () =>
    Effect.gen(function*() {
      yield* programs.renameProject({ id: work.id, name: " Job " })
      const gone = yield* Effect.flip(programs.renameProject({ id: ProjectId.make("gone"), name: "X" }))
      assert.deepStrictEqual((yield* programs.listProjects).map((p) => p.name), ["General", "Job"])
      assert.strictEqual(gone._tag, "ProjectNotFound")
    }).pipe(Effect.provide(MemoryProjectRepository([general, work]))))

  it.effect("deletes a project but keeps the default", () =>
    Effect.gen(function*() {
      yield* programs.removeProject(work.id)
      const protectedDefault = yield* Effect.flip(programs.removeProject(general.id))
      assert.deepStrictEqual((yield* programs.listProjects).map((p) => p.name), ["General"])
      assert.strictEqual(protectedDefault._tag, "DefaultProjectProtected")
    }).pipe(Effect.provide(MemoryProjectRepository([general, work]))))
})
