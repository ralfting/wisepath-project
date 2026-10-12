import { Effect, Layer, Option } from "effect"
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http"
import { LinkPreview, LinkPreviews } from "@wisepath/domain/projects"

/** Previews from the app's own /api/link-preview route; any failure means no preview */
export const HttpLinkPreviews = Layer.effect(
  LinkPreviews,
  Effect.gen(function*() {
    const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk)

    return LinkPreviews.of({
      preview: Effect.fn("LinkPreviews.preview")(
        function*(url) {
          const response = yield* client.get(`/api/link-preview?url=${encodeURIComponent(url)}`)
          return Option.some(yield* HttpClientResponse.schemaBodyJson(LinkPreview)(response))
        },
        Effect.catch(() => Effect.succeedNone)
      )
    })
  })
).pipe(Layer.provide(FetchHttpClient.layer))
