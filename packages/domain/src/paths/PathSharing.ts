import type { Effect } from "effect"
import { Context } from "effect"
import type { UserId } from "../auth/User"
import type { PathShare, ShareEdit, VisibilityEdit } from "./access"
import type { CannotShareWithSelf, PathNotFound, PathsUnavailable, ShareTargetNotFound } from "./errors"
import type { Path, PathId } from "./Path"

/**
 * Sharing paths (docs/plans/14-public-and-shared-paths.md): the owner's invites and visibility, a reader taking a
 * public path or leaving one, and a public path read without an account. Kept by the WisePath API; PathsUnavailable
 * means it could not be reached and the call can be made again.
 */
export class PathSharing extends Context.Service<PathSharing, {
  /** The people the owner invited; PathNotFound for anyone but the owner */
  readonly shares: (id: PathId) => Effect.Effect<ReadonlyArray<PathShare>, PathNotFound | PathsUnavailable>
  readonly share: (
    id: PathId,
    edit: ShareEdit
  ) => Effect.Effect<PathShare, PathNotFound | ShareTargetNotFound | CannotShareWithSelf | PathsUnavailable>
  readonly unshare: (id: PathId, userId: UserId) => Effect.Effect<void, PathNotFound | PathsUnavailable>
  readonly setVisibility: (id: PathId, edit: VisibilityEdit) => Effect.Effect<void, PathNotFound | PathsUnavailable>
  readonly take: (id: PathId) => Effect.Effect<void, PathNotFound | PathsUnavailable>
  readonly leave: (id: PathId) => Effect.Effect<void, PathNotFound | PathsUnavailable>
  /** A public path as someone with no account reads it */
  readonly readPublic: (id: PathId) => Effect.Effect<Path, PathNotFound | PathsUnavailable>
}>()("@wisepath/domain/paths/PathSharing") {}
