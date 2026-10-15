import { Schema } from "effect"
import { InboxItemId } from "./InboxItem"
import type { InboxItem } from "./InboxItem"

/**
 * Commands
 * Capturing an item and discarding it. Ids are made by the client (a UUID),
 * so a capture sent twice (a retry) keeps one item.
 */

/** Something to keep for later: a thought, an address, a moment of a video */
export const Capture = Schema.Struct({
  id: InboxItemId.check(Schema.isMinLength(1), Schema.isMaxLength(64)),
  text: Schema.String.check(
    Schema.isMaxLength(20_000),
    Schema.makeFilter((text: string) => text.trim().length > 0 || "Write something to capture")
  ),
  url: Schema.optional(
    Schema.String.check(
      Schema.isMaxLength(2048),
      Schema.isPattern(/^https?:\/\/\S+$/i, { message: "Use a web address (http or https)" })
    )
  ),
  title: Schema.optional(Schema.String.check(Schema.isMaxLength(500))),
  videoTime: Schema.optional(Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)))
})
export type Capture = typeof Capture.Type

/** The item a capture makes, as it is kept */
export function captured(command: Capture, now = new Date()): InboxItem {
  const { id, text, url, title, videoTime } = command
  return {
    id,
    text,
    ...(url !== undefined ? { url } : {}),
    ...(title !== undefined && title.trim() ? { title: title.trim() } : {}),
    ...(videoTime !== undefined ? { videoTime } : {}),
    createdAt: now.toISOString()
  }
}
