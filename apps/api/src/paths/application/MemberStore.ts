import { Context } from 'effect';
import type { Effect } from 'effect';
import type { UserId } from '@wisepath/domain/auth';
import type { MemberRole, PathId, PathShare } from '@wisepath/domain/paths';

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

    readonly remove: (pathId: PathId, userId: UserId) => Effect.Effect<void>;

    /** Removes everyone who took the path (it went private); invited people stay */
    readonly removeTaken: (pathId: PathId) => Effect.Effect<void>;
  }
>()('@wisepath/api/paths/application/MemberStore') {}
