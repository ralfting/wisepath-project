import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Option } from "effect"
import { TestClock } from "effect/testing"
import { ProjectId, addPage, sampleProject } from "@wisepath/domain/projects"
import { MemoryProjectRepository } from "@/infrastructure/projects/LocalProjectRepository"
import * as programs from "./programs"

describe("project use cases", () => {
  it.effect("loads the shipped sample when nothing was saved", () =>
    Effect.gen(function*() {
      const project = yield* programs.loadProject(sampleProject.id)
      assert.strictEqual(project.pages.length, sampleProject.pages.length)
    }).pipe(Effect.provide(MemoryProjectRepository)))

  it.effect("fails with ProjectNotFound for an unknown id", () =>
    Effect.gen(function*() {
      const exit = yield* Effect.exit(programs.loadProject(ProjectId.make("nope")))
      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) {
        const error = Cause.findErrorOption(exit.cause)
        assert.isTrue(Option.exists(error, (e) => e._tag === "ProjectNotFound"))
      }
    }).pipe(Effect.provide(MemoryProjectRepository)))

  it.effect("saves after the pause and loads the saved copy back", () =>
    Effect.gen(function*() {
      const { project } = addPage(sampleProject, "Generators", programs.newPageId())
      const fiber = yield* Effect.forkChild(programs.saveProject(project))
      yield* TestClock.adjust("300 millis")
      yield* Fiber.join(fiber)
      const loaded = yield* programs.loadProject(sampleProject.id)
      assert.isTrue(loaded.pages.some((p) => p.title === "Generators"))
      const all = yield* programs.listProjects
      assert.strictEqual(all[0]?.pages.length, sampleProject.pages.length + 1)
    }).pipe(Effect.provide(MemoryProjectRepository)))
})
