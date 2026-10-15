import { Schema } from "effect"

/**
 * The Inbox: what a learner wrote down in a hurry, before choosing where it
 * goes. One Inbox per learner, not per path, so capturing never asks where.
 * An item leaves it when it is filed into a page, made a page, or deleted.
 */

export const InboxItemId = Schema.String.pipe(Schema.brand("InboxItemId"))
export type InboxItemId = typeof InboxItemId.Type

export const InboxItem = Schema.Struct({
  id: InboxItemId,
  /** What was written, as markdown; for a pasted address, the address itself */
  text: Schema.String,
  /** The address it came from, if any */
  url: Schema.optional(Schema.String),
  /** The title of that address, from its link preview */
  title: Schema.optional(Schema.String),
  /** A moment of the video at that address, in seconds */
  videoTime: Schema.optional(Schema.Number),
  /** ISO date it came in */
  createdAt: Schema.String
})
export type InboxItem = typeof InboxItem.Type
