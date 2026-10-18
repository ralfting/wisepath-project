import { Context } from 'effect';
import type { Effect } from 'effect';
import type { UserId } from '@wisepath/domain/auth';
import type { AccessNotice, NoticeId } from '@wisepath/domain/paths';

/** Notices of paths learners lost, kept until shown; storage failures are defects, as in PathStore */
export class NoticeStore extends Context.Service<
  NoticeStore,
  {
    /** One notice for each of these learners, with what they need to know about the path they lost */
    readonly add: (userIds: ReadonlyArray<UserId>, notice: Omit<AccessNotice, 'id'>) => Effect.Effect<void>;

    /** The learner's notices, oldest first */
    readonly list: (userId: UserId) => Effect.Effect<ReadonlyArray<AccessNotice>>;

    /** Removes one of the learner's notices; nothing when it is gone or someone else's */
    readonly dismiss: (userId: UserId, id: NoticeId) => Effect.Effect<void>;
  }
>()('@wisepath/api/paths/application/NoticeStore') {}
