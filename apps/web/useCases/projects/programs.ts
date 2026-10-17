import { Effect, Schema } from "effect"
import { NewProject, ProjectEdit, ProjectId, ProjectRepository } from "@wisepath/domain/projects"
import { newId } from "../paths/programs"

/**
 * Project use cases as Effect programs: the learner's groups of paths. Each
 * decodes what it was given with the domain schemas, so a Server Action and a
 * form get the same answer for the same input.
 */

/** The default first, then by name */
export const listProjects = ProjectRepository.use((repo) => repo.list).pipe(Effect.withSpan("useCases.projects.list"))

export const createProject = Effect.fn("useCases.projects.create")(function*(name: string) {
  const command = yield* Schema.decodeUnknownEffect(NewProject)({ id: newId(), name })
  return yield* ProjectRepository.use((repo) => repo.create(command))
})

export const renameProject = Effect.fn("useCases.projects.rename")(function*(input: { readonly id: string; readonly name: string }) {
  const id = yield* Schema.decodeUnknownEffect(ProjectId)(input.id)
  const edit = yield* Schema.decodeUnknownEffect(ProjectEdit)({ name: input.name })
  yield* ProjectRepository.use((repo) => repo.rename(id, edit))
})

/** Its paths move to the default project */
export const removeProject = Effect.fn("useCases.projects.remove")(function*(projectId: string) {
  const id = yield* Schema.decodeUnknownEffect(ProjectId)(projectId)
  yield* ProjectRepository.use((repo) => repo.remove(id))
})
