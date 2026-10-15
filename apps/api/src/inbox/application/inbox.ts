import { Effect, Option } from 'effect';
import { captured } from '@wisepath/domain/inbox';
import type { Capture, InboxItemId } from '@wisepath/domain/inbox';
import { CurrentUser } from '../../projects/application/CurrentUser';
import { InboxStore } from './InboxStore';

/**
 * Inbox use cases: the learner's captured items, newest first. Filing one into
 * a page is a page edit (through /api/projects) followed by a discard here.
 */

export const listInbox = Effect.fn('inbox.list')(function* () {
  const user = yield* CurrentUser;
  const store = yield* InboxStore;

  return yield* store.listOwned(user.id);
});

/** Capturing the same item twice (a retry) returns the one already kept */
export const captureItem = Effect.fn('inbox.capture')(function* (command: Capture) {
  const user = yield* CurrentUser;
  const store = yield* InboxStore;

  const item = captured(command);
  if (yield* store.insert(user.id, item)) return item;

  const existing = yield* store.find(user.id, command.id);
  if (Option.isSome(existing)) return existing.value;

  return yield* Effect.die(new Error(`Inbox item id ${command.id} is already used by another account`));
});

export const discardItem = Effect.fn('inbox.discard')(function* (id: InboxItemId) {
  const user = yield* CurrentUser;
  const store = yield* InboxStore;

  yield* store.remove(user.id, id);
});
