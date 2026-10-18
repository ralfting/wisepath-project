import { Context } from 'effect';
import type { Effect } from 'effect';
import type { UserId } from '@wisepath/domain/auth';
import type { MemberRole, PathId, PathInvite, PathShare } from '@wisepath/domain/paths';

/**
 * The people a path is shared with or who took it. Storage failures are defects, as in PathStore. Removing a member
 * removes their marks on the path too: their progress goes with their access.
 */
export class MemberStore extends Context.Service<
  MemberStore,
  {
    /** The people the owner invited, by when they were invited; never those who took the path */
    readonly listInvited: (pathId: PathId) => Effect.Effect<ReadonlyArray<PathShare>>;

    /** Invites someone, or changes their role; someone who had taken the path becomes invited */
    readonly invite: (pathId: PathId, userId: UserId, role: MemberRole) => Effect.Effect<void>;

    /** Adds someone who takes a public path, as a viewer; nothing when they are already a member */
    readonly take: (pathId: PathId, userId: UserId) => Effect.Effect<void>;

    /** Removes someone and their marks on the path, member or not; whether they were a member */
    readonly remove: (pathId: PathId, userId: UserId) => Effect.Effect<boolean>;

    /** Everyone the path is shared with or who took it */
    readonly memberIds: (pathId: PathId) => Effect.Effect<ReadonlyArray<UserId>>;

    /** The emails the path waits for, by when they were invited */
    readonly listInvites: (pathId: PathId) => Effect.Effect<ReadonlyArray<PathInvite>>;

    /** Keeps an invite for an email with no account yet, or changes its role */
    readonly keepInvite: (pathId: PathId, email: string, role: MemberRole) => Effect.Effect<PathInvite>;

    readonly cancelInvite: (pathId: PathId, email: string) => Effect.Effect<void>;

    /** Turns every invite for this email into a membership of the new account, with its role */
    readonly claimInvites: (userId: UserId, email: string) => Effect.Effect<void>;

    /** Removes everyone who took the path (it went private) and the marks of all but the owner and the invited; who they were */
    readonly removeTaken: (pathId: PathId) => Effect.Effect<ReadonlyArray<UserId>>;
  }
>()('@wisepath/api/paths/application/MemberStore') {}
