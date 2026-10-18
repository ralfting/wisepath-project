import type { Effect } from "effect"
import { Context, Schema } from "effect"
import type { PathsUnavailable } from "./errors"

/**
 * Notices of a path lost without choosing to (docs/plans/14-public-and-shared-paths.md): its owner made it private,
 * stopped sharing it, or deleted it. Each is shown once, the next time the learner opens the app, then dismissed.
 */

export const NoticeId = Schema.String.pipe(Schema.brand("NoticeId"))
export type NoticeId = typeof NoticeId.Type

/** Why the path is gone: made private (it had been taken), no longer shared with them, or deleted */
export const NoticeReason = Schema.Literals(["private", "removed", "deleted"])
export type NoticeReason = typeof NoticeReason.Type

export const AccessNotice = Schema.Struct({
  id: NoticeId,
  /** The path's title when it was lost: the path itself may be gone */
  pathTitle: Schema.String,
  ownerName: Schema.NullOr(Schema.String),
  reason: NoticeReason
})
export type AccessNotice = typeof AccessNotice.Type

/** The learner's notices, kept by the WisePath API; PathsUnavailable means it could not be reached */
export class AccessNotices extends Context.Service<AccessNotices, {
  readonly list: Effect.Effect<ReadonlyArray<AccessNotice>, PathsUnavailable>
  /** Once shown; dismissing one twice changes nothing */
  readonly dismiss: (id: NoticeId) => Effect.Effect<void, PathsUnavailable>
}>()("@wisepath/domain/paths/AccessNotices") {}
