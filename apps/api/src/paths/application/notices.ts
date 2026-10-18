import { Effect, Option } from 'effect';
import type { UserId } from '@wisepath/domain/auth';
import type { NoticeId, NoticeReason, Path } from '@wisepath/domain/paths';
import { UserStore } from '../../auth/application/UserStore';
import { CurrentUser } from './CurrentUser';
import { NoticeStore } from './NoticeStore';

/**
 * Notices of a path lost without choosing to: kept for each learner who lost it, with the path's title and its
 * owner's name (the current user, who made the change), and shown to them once.
 */

export const notifyLost = (userIds: ReadonlyArray<UserId>, path: Path, reason: NoticeReason) =>
  Effect.gen(function* () {
    if (userIds.length === 0) return;
    const user = yield* CurrentUser;
    const owner = yield* (yield* UserStore).findById(user.id);
    const ownerName = Option.match(owner, { onNone: () => null, onSome: (u) => u.name });
    yield* (yield* NoticeStore).add(userIds, { pathTitle: path.title, ownerName, reason });
  });

export const listNotices = Effect.fn('notices.list')(function* () {
  const user = yield* CurrentUser;
  return yield* (yield* NoticeStore).list(user.id);
});

export const dismissNotice = Effect.fn('notices.dismiss')(function* (id: NoticeId) {
  const user = yield* CurrentUser;
  yield* (yield* NoticeStore).dismiss(user.id, id);
});
