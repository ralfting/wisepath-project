import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { NotAuthenticated } from "@wisepath/domain/auth"
import { Capture, InboxItem, InboxItemId } from "@wisepath/domain/inbox"
import { InvalidRequest } from "./InvalidRequest"

/**
 * The learner's Inbox (under /api/inbox): what was captured, waiting to be
 * filed. Every endpoint needs the session cookie and only sees its owner's
 * items. Capturing the same id twice keeps one item, and deleting one that is
 * gone is fine, so a client can retry freely.
 */
export class CaptureApiGroup extends HttpApiGroup.make("inbox")
  .add(
    HttpApiEndpoint.get("list", "/", {
      success: Schema.Array(InboxItem),
      error: [NotAuthenticated]
    }),
    HttpApiEndpoint.post("capture", "/", {
      payload: Capture,
      success: InboxItem.pipe(HttpApiSchema.status(201)),
      error: [NotAuthenticated, InvalidRequest]
    }),
    HttpApiEndpoint.delete("discard", "/:itemId", {
      params: { itemId: InboxItemId },
      error: [NotAuthenticated]
    })
  )
  .prefix("/inbox") {}
