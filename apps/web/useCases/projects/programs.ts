import { Effect } from "effect"
import { ProjectId, ProjectRepository } from "@wisepath/domain/projects"
import { newId } from "../paths/programs"

/** Project use cases as Effect programs: the learner's groups of paths */

/** The default first, then by name */
export const listProjects = ProjectRepository.use((repo) => repo.list).pipe(Effect.withSpan("useCases.projects.list"))

export const createProject = Effect.fn("useCases.projects.create")(function*(name: string) {
  const repo = yield* ProjectRepository
  return yield* repo.create({ id: ProjectId.make(newId()), name: name.trim() })
})

export const renameProject = Effect.fn("useCases.projects.rename")(function*(input: { readonly id: ProjectId; readonly name: string }) {
  const repo = yield* ProjectRepository
  yield* repo.rename(input.id, { name: input.name.trim() })
})

/** Its paths move to the default project */
export const removeProject = Effect.fn("useCases.projects.remove")(function*(id: ProjectId) {
  const repo = yield* ProjectRepository
  yield* repo.remove(id)
})
