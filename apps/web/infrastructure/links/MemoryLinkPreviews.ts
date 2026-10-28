import { Effect, Layer, Option } from "effect"
import { LinkPreviews } from "@wisepath/domain/paths"
import type { LinkPreview } from "@wisepath/domain/paths"

/** A page's preview as a test needs it: a title, the rest empty */
export const aLinkPreview = (fields: Partial<LinkPreview> = {}): LinkPreview => ({
  title: null,
  description: null,
  siteName: "Example",
  favicon: null,
  ...fields
})

/**
 * Previews kept in memory, by address: for tests. An address it does not hold has no preview, as the API answers
 * for a page it can't read
 */
export const MemoryLinkPreviews = (previews: Readonly<Record<string, LinkPreview>> = {}) =>
  Layer.succeed(
    LinkPreviews,
    LinkPreviews.of({
      preview: (url) => Effect.succeed(Option.fromNullishOr(previews[url]))
    })
  )
