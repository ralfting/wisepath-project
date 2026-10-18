import type { Effect } from "effect"
import { Context } from "effect"
import type { UserId } from "../auth/User"
import type { SharedWith, ShareEdit, ShareResult, VisibilityEdit } from "./access"
import type { CannotShareWithSelf, PathNotFound, PathsUnavailable } from "./errors"
import type { Path, PathId } from "./Path"
import type { PublicationRequest } from "./publication"

/**
 * Sharing paths (docs/plans/14-public-and-shared-paths.md): the owner's invites and visibility, a reader taking a
 * public path or leaving one, and a public path read without an account. Kept by the WisePath API; PathsUnavailable
 * means it could not be reached and the call can be made again.
 */
export class PathSharing extends Context.Service<PathSharing, {
  /** The people the owner invited and the emails waiting for a sign up; PathNotFound for anyone but the owner */
  readonly shares: (id: PathId) => Effect.Effect<SharedWith, PathNotFound | PathsUnavailable>
  /** Shares with an account, or keeps an invite for an email with none yet */
  readonly share: (id: PathId, edit: ShareEdit) => Effect.Effect<ShareResult, PathNotFound | CannotShareWithSelf | PathsUnavailable>
  readonly unshare: (id: PathId, userId: UserId) => Effect.Effect<void, PathNotFound | PathsUnavailable>
  /** Drops an invite that is still waiting */
  readonly cancelInvite: (id: PathId, email: string) => Effect.Effect<void, PathNotFound | PathsUnavailable>
  readonly setVisibility: (id: PathId, edit: VisibilityEdit) => Effect.Effect<void, PathNotFound | PathsUnavailable>
  readonly take: (id: PathId) => Effect.Effect<void, PathNotFound | PathsUnavailable>
  readonly leave: (id: PathId) => Effect.Effect<void, PathNotFound | PathsUnavailable>
  /** Asks to publish the path to the catalog, saving what it teaches, who it is for and its language */
  readonly requestPublication: (id: PathId, request: PublicationRequest) => Effect.Effect<void, PathNotFound | PathsUnavailable>
  /** Withdraws the request, or takes the path out of the catalog, readable by its link */
  readonly withdrawPublication: (id: PathId) => Effect.Effect<void, PathNotFound | PathsUnavailable>
  /** A public path as someone with no account reads it */
  readonly readPublic: (id: PathId) => Effect.Effect<Path, PathNotFound | PathsUnavailable>
}>()("@wisepath/domain/paths/PathSharing") {}
