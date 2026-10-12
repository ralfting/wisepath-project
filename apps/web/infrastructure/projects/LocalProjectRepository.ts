import { Effect, Layer } from "effect"
import { KeyValueStore } from "effect/persistence"
import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Project, ProjectRepository, ProjectStorageError } from "@wisepath/domain/projects"

/** Bumped when the shipped sample changes, so browsers drop copies saved from the old one */
const keyFor = (id: string) => `wisepath:project:v5:${id}`

/**
 * Projects kept in this browser's localStorage, validated by the Project schema.
 * Loading always yields first, so the server render and the first client render
 * agree (both start "loading") before saved data appears.
 */
export const ProjectRepositoryLive = Layer.effect(
  ProjectRepository,
  Effect.gen(function*() {
    const store = KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, Project)
    const storageError = (cause: unknown) => new ProjectStorageError({ cause })

    return ProjectRepository.of({
      load: Effect.fn("ProjectRepository.load")(
        function*(id) {
          yield* Effect.yieldNow
          return yield* store.get(keyFor(id))
        },
        Effect.mapError(storageError)
      ),
      save: Effect.fn("ProjectRepository.save")(
        function*(project) {
          yield* store.set(keyFor(project.id), project)
        },
        Effect.mapError(storageError)
      )
    })
  })
)

/** localStorage in the browser; memory while rendering on the server, where there is none */
export const DeviceKeyValueStore = Layer.unwrap(
  Effect.sync(() =>
    typeof window === "undefined" ? KeyValueStore.layerMemory : BrowserKeyValueStore.layerLocalStorage
  )
)

export const LocalProjectRepository = ProjectRepositoryLive.pipe(Layer.provide(DeviceKeyValueStore))

/** Same repository in memory, for tests */
export const MemoryProjectRepository = ProjectRepositoryLive.pipe(Layer.provide(KeyValueStore.layerMemory))
