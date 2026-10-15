import type { Effect } from "effect"
import { Context } from "effect"
import type { Capture } from "./commands"
import type { InboxUnavailable } from "./errors"
import type { InboxItem, InboxItemId } from "./InboxItem"

/**
 * Where the learner's Inbox is kept: the WisePath API. Capturing or discarding
 * twice changes nothing more, so either can be sent again after
 * InboxUnavailable.
 */
export class InboxRepository extends Context.Service<InboxRepository, {
  /** Newest first */
  readonly list: Effect.Effect<ReadonlyArray<InboxItem>, InboxUnavailable>
  readonly capture: (command: Capture) => Effect.Effect<InboxItem, InboxUnavailable>
  readonly discard: (id: InboxItemId) => Effect.Effect<void, InboxUnavailable>
}>()("@wisepath/domain/inbox/InboxRepository") {}
