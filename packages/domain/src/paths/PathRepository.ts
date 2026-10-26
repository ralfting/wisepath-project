import type { Effect } from "effect"
import { Context } from "effect"
import type { NewPage, NewPath, PageEdit, PathEdit, PathSummary, RemoveNote, WriteNote } from "./commands"
import type { ActivitiesOpen, PageNotFound, PathNotFound, PathsUnavailable, RootPageProtected, TitleTaken } from "./errors"
import type { Page, PageId, Path, PathId } from "./Path"
import type { ProjectNotFound } from "../projects/errors"

/**
 * Where the learner's paths are kept: the WisePath API. Each change is one
 * command (see commands.ts); a command sent twice changes nothing more.
 * PathsUnavailable means the API could not be reached and the command can
 * be sent again; every other error is final.
 */
export class PathRepository extends Context.Service<PathRepository, {
  readonly list: Effect.Effect<ReadonlyArray<PathSummary>, PathsUnavailable>
  readonly get: (id: PathId) => Effect.Effect<Path, PathNotFound | PathsUnavailable>
  readonly create: (command: NewPath) => Effect.Effect<Path, ProjectNotFound | PathsUnavailable>
  /** ProjectNotFound when moving it to a project that isn't the learner's */
  readonly update: (id: PathId, edit: PathEdit) => Effect.Effect<void, PathNotFound | ProjectNotFound | PathsUnavailable>
  readonly remove: (id: PathId) => Effect.Effect<void, PathsUnavailable>
  /** The learner's copy of the sample path; asking again returns the same copy */
  readonly takeSample: Effect.Effect<Path, PathsUnavailable>
  readonly createPage: (
    id: PathId,
    command: NewPage
  ) => Effect.Effect<Page, PathNotFound | TitleTaken | PathsUnavailable>
  /** ActivitiesOpen when marking a learning path's page studied before its activities are done */
  readonly updatePage: (
    id: PathId,
    pageId: PageId,
    edit: PageEdit
  ) => Effect.Effect<void, PathNotFound | PageNotFound | TitleTaken | ActivitiesOpen | PathsUnavailable>
  readonly removePage: (
    id: PathId,
    pageId: PageId
  ) => Effect.Effect<void, PathNotFound | RootPageProtected | PathsUnavailable>
  /** The reader's own note on a page, new or rewritten */
  readonly writeNote: (id: PathId, command: WriteNote) => Effect.Effect<void, PathNotFound | PageNotFound | PathsUnavailable>
  readonly removeNote: (id: PathId, command: RemoveNote) => Effect.Effect<void, PathNotFound | PathsUnavailable>
}>()("@wisepath/domain/paths/PathRepository") {}
