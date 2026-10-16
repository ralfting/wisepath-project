import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api"
import { NotAuthenticated } from "@wisepath/domain/auth"
import { LinkNotPreviewable, LinkPreview } from "@wisepath/domain/paths"
import { InvalidRequest } from "./InvalidRequest"

/**
 * Previews of external links written in the notes (under /api/link-preview).
 * The API fetches the page itself, so only signed-in users may ask, and only
 * for public http(s) pages.
 */
export class LinksApiGroup extends HttpApiGroup.make("links")
  .add(
    HttpApiEndpoint.get("preview", "/link-preview", {
      query: { url: Schema.String },
      success: LinkPreview,
      error: [NotAuthenticated, InvalidRequest, LinkNotPreviewable]
    })
  )
{}
