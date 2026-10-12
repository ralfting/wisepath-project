import type { Effect, Option } from "effect"
import { Context, Schema } from "effect"

/** What a web page says about itself: shown when hovering a link in the notes */
export const LinkPreview = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  description: Schema.NullOr(Schema.String),
  siteName: Schema.String,
  favicon: Schema.NullOr(Schema.String)
})
export type LinkPreview = typeof LinkPreview.Type

/** Looks up previews of external links; none when a page can't be previewed */
export class LinkPreviews extends Context.Service<LinkPreviews, {
  readonly preview: (url: string) => Effect.Effect<Option.Option<LinkPreview>>
}>()("@wisepath/domain/projects/LinkPreviews") {}
