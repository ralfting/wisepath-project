import { Effect, Option } from 'effect';
import { CannotShareWithSelf, PathNotFound } from '@wisepath/domain/paths';
import type { PathId, PathShare, ShareEdit, SharedWith, VisibilityEdit } from '@wisepath/domain/paths';
import type { UserId } from '@wisepath/domain/auth';
import { UserStore } from '../../auth/application/UserStore';
import { CurrentUser } from './CurrentUser';
import { MemberStore } from './MemberStore';
import { PathStore } from './PathStore';
import { PublicationStore } from './PublicationStore';
import { notifyLost } from './notices';
import { findFor, manages, reads } from './paths';

/**
 * Sharing a path (docs/plans/14-public-and-shared-paths.md): its owner invites people to read or edit it and makes it
 * public; anyone may take a public path to study it. Taking is a membership, never a copy: the content stays the
 * owner's, and so does the say over it.
 */

export const listShares = Effect.fn('paths.shares')(function* (id: PathId) {
  const members = yield* MemberStore;
  yield* findFor(id, manages);
  const shared: SharedWith = { people: yield* members.listInvited(id), invites: yield* members.listInvites(id) };
  return shared;
});

/** Shares with the account that has this email, or keeps an invite for it until someone signs up with it */
export const sharePath = Effect.fn('paths.share')(function* (id: PathId, edit: ShareEdit) {
  const user = yield* CurrentUser;
  const members = yield* MemberStore;
  yield* findFor(id, manages);

  const account = yield* (yield* UserStore).findByEmail(edit.email);
  if (Option.isNone(account)) return yield* members.keepInvite(id, edit.email, edit.role);
  const { user: invited } = account.value;
  if (invited.id === user.id) return yield* new CannotShareWithSelf();

  yield* members.invite(id, invited.id, edit.role);
  const share: PathShare = { userId: invited.id, name: invited.name, email: invited.email, role: edit.role };
  return share;
});

export const cancelInvite = Effect.fn('paths.cancelInvite')(function* (id: PathId, email: string) {
  yield* findFor(id, manages);
  yield* (yield* MemberStore).cancelInvite(id, email);
});

/**
 * The owner removes someone, or someone leaves a path that is not theirs. The path is held meanwhile, so a mark
 * being saved can't land after the marks are gone. The owner can't remove themselves (nor their own marks)
 */
export const unsharePath = Effect.fn('paths.unshare')(function* (id: PathId, userId: UserId) {
  const user = yield* CurrentUser;
  const store = yield* PathStore;
  const members = yield* MemberStore;

  yield* store.transaction(
    Effect.gen(function* () {
      const path = yield* findFor(id, reads, { lock: true });
      if (path.access !== 'owner' && userId !== user.id) return yield* new PathNotFound({ pathId: id });
      if (path.access === 'owner' && userId === user.id) return;
      const wasMember = yield* members.remove(id, userId);
      // The owner took it from them; someone leaving chose to
      if (wasMember && userId !== user.id) yield* notifyLost([userId], path, 'removed');
    }),
  );
});

export const leavePath = Effect.fn('paths.leave')(function* (id: PathId) {
  const user = yield* CurrentUser;
  yield* unsharePath(id, user.id);
});

export const setVisibility = Effect.fn('paths.setVisibility')(function* (id: PathId, edit: VisibilityEdit) {
  const store = yield* PathStore;
  const members = yield* MemberStore;

  yield* store.transaction(
    Effect.gen(function* () {
      const path = yield* findFor(id, manages, { lock: true });
      yield* store.setVisibility(id, edit.visibility);
      // A private path is no one's to study but its owner's and the people they invited, nor a candidate for the catalog
      if (edit.visibility === 'private') {
        yield* notifyLost(yield* members.removeTaken(id), path, 'private');
        yield* (yield* PublicationStore).drop(id);
      }
    }),
  );
});

/**
 * Adds a public path to the reader's paths; their own, or one they are a member of, stays as it is. The path is held
 * while it is checked and taken, so it can't go private in between and keep a taker the owner never sees
 */
export const takePath = Effect.fn('paths.take')(function* (id: PathId) {
  const user = yield* CurrentUser;
  const store = yield* PathStore;
  const members = yield* MemberStore;

  yield* store.transaction(
    Effect.gen(function* () {
      const path = yield* findFor(id, reads, { lock: true });
      if (path.access === 'owner') return;
      yield* members.take(id, user.id);
    }),
  );
});

/** A public path as someone with no account reads it: no marks, nothing to change */
export const readPublicPath = Effect.fn('paths.readPublic')(function* (id: PathId) {
  const found = yield* (yield* PathStore).find(null, id);
  if (Option.isNone(found)) return yield* new PathNotFound({ pathId: id });
  return found.value;
});
