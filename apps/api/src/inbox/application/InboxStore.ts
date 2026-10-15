import { Context } from 'effect';
import type { Effect, Option } from 'effect';
import type { UserId } from '@wisepath/domain/auth';
import type { InboxItem, InboxItemId } from '@wisepath/domain/inbox';

/**
 * Where Inbox items are stored. Storage failures are defects here: the request
 * fails with a 500 and is logged.
 */
export class InboxStore extends Context.Service<
  InboxStore,
  {
    /** The owner's items, newest first */
    readonly listOwned: (ownerId: UserId) => Effect.Effect<ReadonlyArray<InboxItem>>;

    readonly find: (ownerId: UserId, id: InboxItemId) => Effect.Effect<Option.Option<InboxItem>>;

    /** Stores a new item; false when its id is already used */
    readonly insert: (ownerId: UserId, item: InboxItem) => Effect.Effect<boolean>;

    /** Removes one of the owner's items; nothing happens when it is gone or someone else's */
    readonly remove: (ownerId: UserId, id: InboxItemId) => Effect.Effect<void>;
  }
>()('@wisepath/api/inbox/application/InboxStore') {}
