import { Schema } from "effect"
import { Email, UserId } from "../auth/User"

/**
 * Who may do what with a path (docs/plans/14-public-and-shared-paths.md). A path is its owner's; they can make it
 * public, readable by anyone with its link, and invite people to read or to edit it. A learner can also take a
 * public path to study it. Progress is never part of access: every learner marks their own pages studied.
 */

/** Private: only its owner and the people they invited. Public: anyone with the link can read it */
export const PathVisibility = Schema.Literals(["private", "public"])
export type PathVisibility = typeof PathVisibility.Type

/** What a member may do: read (and study), or edit the pages too */
export const MemberRole = Schema.Literals(["viewer", "editor"])
export type MemberRole = typeof MemberRole.Type

/** Invited by the owner, or a public path taken to study (always as a viewer) */
export const MemberSource = Schema.Literals(["invited", "taken"])
export type MemberSource = typeof MemberSource.Type

/** What a learner may do with a path, from most to least */
export const PathAccess = Schema.Literals(["owner", "editor", "viewer", "none"])
export type PathAccess = typeof PathAccess.Type

/** Someone a path was shared with or who took it */
export const PathMember = Schema.Struct({
  userId: UserId,
  role: MemberRole,
  source: MemberSource
})
export type PathMember = typeof PathMember.Type

/** A person the owner invited, as the Share dialog lists them; who took a public path is never listed */
export const PathShare = Schema.Struct({
  userId: UserId,
  name: Schema.NullOr(Schema.String),
  email: Schema.String,
  role: MemberRole
})
export type PathShare = typeof PathShare.Type

/** What deciding access needs to know about a path */
export interface AccessFacts {
  readonly ownerId: UserId
  readonly visibility: PathVisibility
  readonly members: ReadonlyArray<PathMember>
}

/**
 * The one rule for access: the owner is the owner, a member has their role, a public path can be read by anyone
 * (signed in or not), and nobody else sees it. The API decides with it too, over what it reads with the path.
 */
export function accessOf(path: AccessFacts, viewer: UserId | null): PathAccess {
  if (viewer !== null && viewer === path.ownerId) return "owner"
  const member = viewer === null ? undefined : path.members.find((m) => m.userId === viewer)
  if (member !== undefined) return member.role
  return path.visibility === "public" ? "viewer" : "none"
}

/** Reading a path includes studying it: marking its pages, which are the reader's own marks */
export const canRead = (access: PathAccess) => access !== "none"

/** Adding, editing and removing pages */
export const canEdit = (access: PathAccess) => access === "owner" || access === "editor"

/** Renaming, moving, deleting the path, its kind, its visibility and its members */
export const canManage = (access: PathAccess) => access === "owner"

/** Share a path with an account, or change the role of someone it is shared with */
export const ShareEdit = Schema.Struct({
  email: Email,
  role: MemberRole
})
export type ShareEdit = typeof ShareEdit.Type

export const VisibilityEdit = Schema.Struct({
  visibility: PathVisibility
})
export type VisibilityEdit = typeof VisibilityEdit.Type
