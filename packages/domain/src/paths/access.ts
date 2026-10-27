import { Schema } from "effect"
import { Email, Locale, UserId } from "../auth/User"
import type { PageEdit } from "./commands"
import type { PageId, Path } from "./Path"

/**
 * Who may do what with a path (docs/plans/14-public-and-shared-paths.md). A path is its owner's; they can make it
 * public, readable by anyone with its link, and invite people to read or to edit it. A learner can also take a
 * public path to study it. Progress is never part of access: every learner marks their own pages studied and writes
 * their own notes.
 */

/**
 * Private: only its owner and the people they invited. Public: anyone with the link can read it, never listed.
 * Published: anyone can read it, and it is listed in the catalog; only an approval sets it
 * (docs/plans/19-publish-to-the-catalog.md).
 */
export const PathVisibility = Schema.Literals(["private", "public", "published"])
export type PathVisibility = typeof PathVisibility.Type

/** What the owner may set themselves; publishing goes through a request */
export const LinkVisibility = Schema.Literals(["private", "public"])
export type LinkVisibility = typeof LinkVisibility.Type

/** The language a path is written in, so the catalog can show it to those who read it */
export const PathLanguage = Locale
export type PathLanguage = typeof PathLanguage.Type

/** A request to publish waiting for an administrator, or one they declined; an approved one is `published` */
export const PublicationStatus = Schema.Literals(["pending", "declined"])
export type PublicationStatus = typeof PublicationStatus.Type

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

/**
 * An email the owner shared the path with before it had an account: it gives nothing yet, and becomes a membership
 * with this role when someone signs up with that email. WisePath sends nothing; the owner tells them
 */
export const PathInvite = Schema.Struct({
  email: Schema.String,
  role: MemberRole
})
export type PathInvite = typeof PathInvite.Type

/** Who the owner shared a path with: the people who have it, and the emails still waiting for a sign up */
export const SharedWith = Schema.Struct({
  people: Schema.Array(PathShare),
  invites: Schema.Array(PathInvite)
})
export type SharedWith = typeof SharedWith.Type

/** What sharing with an email gives: the person, or an invite while the email has no account */
export const ShareResult = Schema.Union([PathShare, PathInvite])
export type ShareResult = typeof ShareResult.Type

/** What deciding access needs to know about a path */
export interface AccessFacts {
  readonly ownerId: UserId
  readonly visibility: PathVisibility
  readonly members: ReadonlyArray<PathMember>
}

/**
 * The one rule for access: the owner is the owner, a member has their role, a public or published path can be read by anyone
 * (signed in or not), and nobody else sees it. The API decides with it too, over what it reads with the path.
 */
export function accessOf(path: AccessFacts, viewer: UserId | null): PathAccess {
  if (viewer !== null && viewer === path.ownerId) return "owner"
  const member = viewer === null ? undefined : path.members.find((m) => m.userId === viewer)
  if (member !== undefined) return member.role
  return path.visibility === "private" ? "none" : "viewer"
}

/** Reading a path includes studying it: marking its pages and writing notes on them, which are the reader's own */
export const canRead = (access: PathAccess) => access !== "none"

/** Writing and removing notes on a path's pages: they are the reader's own, so reading it is enough */
export const mayWriteNotes = (path: Pick<Path, "access">) => canRead(path.access)

/** Adding, editing and removing pages */
export const canEdit = (access: PathAccess) => access === "owner" || access === "editor"

/** Renaming, moving, deleting the path, its kind, its visibility and its members */
export const canManage = (access: PathAccess) => access === "owner"

/**
 * Whether the path's reader may make this edit of a page. A studied mark, ticked activities and answers alone are
 * their own progress, so reading is enough; renaming the root renames the path, which is its owner's; anything else edits the
 * page.
 */
export function mayEditPage(path: Pick<Path, "access" | "rootPageId">, pageId: PageId, edit: PageEdit): boolean {
  const { studied: _studied, ticks: _ticks, answers: _answers, ...rest } = edit
  if (Object.values(rest).every((value) => value === undefined)) return canRead(path.access)
  return pageId === path.rootPageId && edit.title !== undefined ? canManage(path.access) : canEdit(path.access)
}

/** Share a path with an account, or change the role of someone it is shared with */
export const ShareEdit = Schema.Struct({
  email: Email,
  role: MemberRole
})
export type ShareEdit = typeof ShareEdit.Type

export const VisibilityEdit = Schema.Struct({
  visibility: LinkVisibility
})
export type VisibilityEdit = typeof VisibilityEdit.Type
