import type { Effect } from "effect"
import { Context } from "effect"
import type { DefaultProjectProtected, ProjectNotFound, ProjectsUnavailable } from "./errors"
import type { NewProject, Project, ProjectEdit, ProjectId } from "./Project"

/**
 * Where the learner's projects are kept: the WisePath API. ProjectsUnavailable
 * means the API could not be reached and the call can be made again; every
 * other error is final.
 */
export class ProjectRepository extends Context.Service<ProjectRepository, {
  /** The default first, then by name */
  readonly list: Effect.Effect<ReadonlyArray<Project>, ProjectsUnavailable>
  readonly create: (command: NewProject) => Effect.Effect<Project, ProjectsUnavailable>
  readonly rename: (id: ProjectId, edit: ProjectEdit) => Effect.Effect<void, ProjectNotFound | ProjectsUnavailable>
  /** Its paths move to the default project */
  readonly remove: (id: ProjectId) => Effect.Effect<void, DefaultProjectProtected | ProjectsUnavailable>
}>()("@wisepath/domain/projects/ProjectRepository") {}
