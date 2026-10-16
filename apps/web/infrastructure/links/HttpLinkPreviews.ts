import { Effect, Layer, Option } from "effect"
import { LinkPreviews } from "@wisepath/domain/paths"
import { ApiClient } from "../http/ApiClient"

/** Previews from the WisePath API (/api/link-preview); any failure means no preview */
export const HttpLinkPreviews = Layer.effect(
  LinkPreviews,
  Effect.gen(function*() {
    const client = yield* ApiClient

    return LinkPreviews.of({
      preview: Effect.fn("LinkPreviews.preview")(
        function*(url) {
          return Option.some(yield* client.links.preview({ query: { url } }))
        },
        Effect.catch(() => Effect.succeedNone)
      )
    })
  })
).pipe(Layer.provide(ApiClient.layer))
