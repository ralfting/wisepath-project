import { Effect, Option } from 'effect';
import { CannotShareWithSelf, PathNotFound, ShareTargetNotFound } from '@wisepath/domain/paths';
import type { PathId, PathShare, ShareEdit, VisibilityEdit } from '@wisepath/domain/paths';
import type { UserId } from '@wisepath/domain/auth';
import { UserStore } from '../../auth/application/UserStore';
import { CurrentUser } from './CurrentUser';
import { MemberStore } from './MemberStore';
import { PathStore } from './PathStore';
import { findFor, manages, reads } from './paths';

/**
 * Sharing a path (docs/plans/14-public-and-shared-paths.md): its owner invites people to read or edit it and makes it
 * public; anyone may take a public path to study it. Taking is a membership, never a copy: the content stays the
 * owner's, and so does the say over it.
 */

export const listShares = Effect.fn('paths.shares')(function* (id: PathId) {
  yield* findFor(id, manages);
  return yield* (yield* MemberStore).listInvited(id);
});

export const sharePath = Effect.fn('paths.share')(function* (id: PathId, edit: ShareEdit) {
  const user = yield* CurrentUser;
  yield* findFor(id, manages);

  const account = yield* (yield* UserStore).findByEmail(edit.email);
  if (Option.isNone(account)) return yield* new ShareTargetNotFound({ email: edit.email });
  const { user: invited } = account.value;
  if (invited.id === user.id) return yield* new CannotShareWithSelf();

  yield* (yield* MemberStore).invite(id, invited.id, edit.role);
  const share: PathShare = { userId: invited.id, name: invited.name, email: invited.email, role: edit.role };
  return share;
});

/** The owner removes someone, or someone leaves a path that is not theirs */
export const unsharePath = Effect.fn('paths.unshare')(function* (id: PathId, userId: UserId) {
  const user = yield* CurrentUser;
  const path = yield* findFor(id, reads);
  if (path.access !== 'owner' && userId !== user.id) return yield* new PathNotFound({ pathId: id });

  yield* (yield* MemberStore).remove(id, userId);
});

export const setVisibility = Effect.fn('paths.setVisibility')(function* (id: PathId, edit: VisibilityEdit) {
  const store = yield* PathStore;
  const members = yield* MemberStore;

  yield* store.transaction(
    Effect.gen(function* () {
      yield* findFor(id, manages, { lock: true });
      yield* store.setVisibility(id, edit.visibility);
      // A private path is no one's to study but its owner's and the people they invited
      if (edit.visibility === 'private') yield* members.removeTaken(id);
    }),
  );
});

/** Adds a public path to the reader's paths; their own, or one they are a member of, stays as it is */
export const takePath = Effect.fn('paths.take')(function* (id: PathId) {
  const user = yield* CurrentUser;
  const path = yield* findFor(id, reads);
  if (path.access === 'owner') return;

  yield* (yield* MemberStore).take(id, user.id);
});

/** A public path as someone with no account reads it: no marks, nothing to change */
export const readPublicPath = Effect.fn('paths.readPublic')(function* (id: PathId) {
  const found = yield* (yield* PathStore).find(null, id);
  if (Option.isNone(found)) return yield* new PathNotFound({ pathId: id });
  return found.value;
});
