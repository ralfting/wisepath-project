import type { Effect } from "effect"
import { Context } from "effect"
import type { NewPage, NewProject, PageEdit, ProjectEdit, ProjectSummary } from "./commands"
import type { PageNotFound, ProjectNotFound, ProjectsUnavailable, RootPageProtected, TitleTaken } from "./errors"
import type { Page, PageId, Project, ProjectId } from "./Project"

/**
 * Where the learner's projects are kept: the WisePath API. Each change is one
 * command (see commands.ts); a command sent twice changes nothing more.
 * ProjectsUnavailable means the API could not be reached and the command can
 * be sent again; every other error is final.
 */
export class ProjectRepository extends Context.Service<ProjectRepository, {
  readonly list: Effect.Effect<ReadonlyArray<ProjectSummary>, ProjectsUnavailable>
  readonly get: (id: ProjectId) => Effect.Effect<Project, ProjectNotFound | ProjectsUnavailable>
  readonly create: (command: NewProject) => Effect.Effect<Project, ProjectsUnavailable>
  readonly update: (id: ProjectId, edit: ProjectEdit) => Effect.Effect<void, ProjectNotFound | ProjectsUnavailable>
  readonly remove: (id: ProjectId) => Effect.Effect<void, ProjectsUnavailable>
  readonly createPage: (
    id: ProjectId,
    command: NewPage
  ) => Effect.Effect<Page, ProjectNotFound | TitleTaken | ProjectsUnavailable>
  readonly updatePage: (
    id: ProjectId,
    pageId: PageId,
    edit: PageEdit
  ) => Effect.Effect<void, ProjectNotFound | PageNotFound | TitleTaken | RootPageProtected | ProjectsUnavailable>
  readonly removePage: (
    id: ProjectId,
    pageId: PageId
  ) => Effect.Effect<void, ProjectNotFound | RootPageProtected | ProjectsUnavailable>
}>()("@wisepath/domain/projects/ProjectRepository") {}
