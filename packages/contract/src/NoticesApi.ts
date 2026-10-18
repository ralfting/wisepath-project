import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api"
import { NotAuthenticated } from "@wisepath/domain/auth"
import { AccessNotice, NoticeId } from "@wisepath/domain/paths"

/**
 * The learner's notices of paths they lost (under /api/notices): made private, no longer shared with them, or
 * deleted by their owner. The web shows each once and dismisses it. Every endpoint needs the session.
 */
export class NoticesApiGroup extends HttpApiGroup.make("notices")
  .add(
    HttpApiEndpoint.get("list", "/", {
      success: Schema.Array(AccessNotice),
      error: [NotAuthenticated]
    }),
    /** Dismissing one already gone changes nothing */
    HttpApiEndpoint.delete("dismiss", "/:noticeId", {
      params: { noticeId: NoticeId },
      error: [NotAuthenticated]
    })
  )
  .prefix("/notices") {}
