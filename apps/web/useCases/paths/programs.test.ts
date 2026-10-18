import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Ref } from "effect"
import { PathRepository, samplePath } from "@wisepath/domain/paths"
import type { NewPath, PathEdit } from "@wisepath/domain/paths"
import * as programs from "./programs"

/** A repository that records what reaches it; Server Actions call these programs with whatever a POST sends */
const recording = Effect.gen(function*() {
  const sent = yield* Ref.make<ReadonlyArray<string>>([])
  const record = (call: string) => Ref.update(sent, (all) => [...all, call])
  const layer = Layer.succeed(PathRepository)(PathRepository.of({
    list: Effect.succeed([]),
    get: () => Effect.succeed(samplePath),
    create: (command: NewPath) => record(`create ${command.title} ${command.kind}`).pipe(Effect.as(samplePath)),
    update: (id, edit: PathEdit) => record(`update ${id} ${JSON.stringify(edit)}`),
    remove: (id) => record(`remove ${id}`),
    createPage: () => Effect.die("not used"),
    updatePage: () => Effect.die("not used"),
    removePage: () => Effect.die("not used")
  }))
  return { sent, layer }
})

describe("path use cases behind the Server Actions", () => {
  it.effect("decodes what they are sent and passes on only valid commands", () =>
    Effect.gen(function*() {
      const { sent, layer } = yield* recording
      const run = <A, E extends { readonly _tag: string }>(effect: Effect.Effect<A, E, PathRepository>) => effect.pipe(Effect.provide(layer), Effect.flip, Effect.map((e) => e._tag), Effect.orElseSucceed(() => "ok"))

      const outcomes = [
        yield* run(programs.createPath({ title: "  Rust ", kind: "learningPath", projectId: "general" })),
        yield* run(programs.createPath({ title: "   ", kind: "study", projectId: "general" })),
        yield* run(programs.createPath({ title: "Go", kind: "course", projectId: "general" })),
        yield* run(programs.movePath("rust", "work")),
        yield* run(programs.setPathKind("rust", "study")),
        yield* run(programs.setPathKind("rust", "anything")),
        yield* run(programs.removePath("rust"))
      ]
      assert.deepStrictEqual(outcomes, ["ok", "SchemaError", "SchemaError", "ok", "ok", "SchemaError", "ok"])
      assert.deepStrictEqual(yield* Ref.get(sent), [
        "create Rust learningPath",
        'update rust {"projectId":"work"}',
        'update rust {"kind":"study"}',
        "remove rust"
      ])
    }))
})
