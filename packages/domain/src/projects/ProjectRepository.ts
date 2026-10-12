import type { Effect, Option } from "effect"
import { Context } from "effect"
import type { ProjectStorageError } from "./errors"
import type { Project, ProjectId } from "./Project"

/**
 * Where projects are kept. Today an infrastructure layer keeps them on this
 * device; later the WisePath API will.
 */
export class ProjectRepository extends Context.Service<ProjectRepository, {
  /** The saved project, or none if it was never saved */
  readonly load: (id: ProjectId) => Effect.Effect<Option.Option<Project>, ProjectStorageError>
  readonly save: (project: Project) => Effect.Effect<void, ProjectStorageError>
}>()("@wisepath/domain/projects/ProjectRepository") {}
