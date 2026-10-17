import { Effect, Layer, Ref } from "effect"
import { DefaultProjectProtected, ProjectId, ProjectNotFound, ProjectRepository, sortProjects } from "@wisepath/domain/projects"
import type { Project } from "@wisepath/domain/projects"

/**
 * Projects kept in memory: for tests and for running the app without the API.
 * Follows the API's answers (default first, a create sent twice changes nothing,
 * the default can't be deleted), except that deleting one does not move its
 * paths, which live in another store.
 */
export const MemoryProjectRepository = (projects: ReadonlyArray<Project> = []) =>
  Layer.effect(
    ProjectRepository,
    Effect.gen(function*() {
      const store = yield* Ref.make(projects)

      return ProjectRepository.of({
        list: Ref.get(store).pipe(Effect.map(sortProjects)),
        create: Effect.fn("MemoryProjectRepository.create")(function*(command) {
          const existing = (yield* Ref.get(store)).find((p) => p.id === command.id)
          if (existing) return existing
          const project: Project = { id: command.id, name: command.name, isDefault: false }
          yield* Ref.update(store, (all) => [...all, project])
          return project
        }),
        rename: Effect.fn("MemoryProjectRepository.rename")(function*(id, edit) {
          const all = yield* Ref.get(store)
          if (!all.some((p) => p.id === id)) return yield* new ProjectNotFound({ projectId: id })
          yield* Ref.set(store, all.map((p) => (p.id === id ? { ...p, name: edit.name } : p)))
        }),
        remove: Effect.fn("MemoryProjectRepository.remove")(function*(id) {
          const all = yield* Ref.get(store)
          if (all.some((p) => p.id === id && p.isDefault)) return yield* new DefaultProjectProtected({ projectId: id })
          yield* Ref.set(store, all.filter((p) => p.id !== id))
        })
      })
    })
  )

/** A project for tests: a named, non-default one unless told otherwise; the id follows the name */
export const aProject = (fields: Partial<Project> & { readonly name: string }): Project => ({
  id: ProjectId.make(fields.name.toLowerCase()),
  isDefault: false,
  ...fields
})
