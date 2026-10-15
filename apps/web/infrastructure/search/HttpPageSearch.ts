import { Effect, Layer } from "effect"
import { PageSearch, SearchUnavailable } from "@wisepath/domain/search"
import { ApiClient } from "../http/ApiClient"

/** Search from the WisePath API (/api/search); any failure means search can't be reached now */
export const HttpPageSearch = Layer.effect(
  PageSearch,
  Effect.gen(function*() {
    const client = yield* ApiClient

    return PageSearch.of({
      search: Effect.fn("PageSearch.search")(
        function*(q, limit) {
          return yield* client.search.search({ query: limit === undefined ? { q } : { q, limit } })
        },
        Effect.mapError((cause) => new SearchUnavailable({ cause }))
      )
    })
  })
).pipe(Layer.provide(ApiClient.layer))
