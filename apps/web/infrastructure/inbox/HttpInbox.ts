import { Effect, Layer, Predicate } from "effect"
import { HttpClientError } from "effect/http"
import { InboxRepository, InboxUnavailable } from "@wisepath/domain/inbox"
import { ApiClient } from "../http/ApiClient"

/**
 * The Inbox kept by the WisePath API (/api/inbox). Anything that may work on
 * a second try (no connection, a server error, an expired session) becomes
 * InboxUnavailable; anything else, like a request the server rejects as
 * malformed, is a bug and becomes a defect.
 */

const retryable = (error: unknown) => {
  if (HttpClientError.isHttpClientError(error)) {
    const status = error.response?.status
    return status === undefined || status >= 500 || status === 408 || status === 429
  }
  return Predicate.isTagged(error, "NotAuthenticated")
}

const classify = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, InboxUnavailable, R> =>
  Effect.catch(effect, (error) => (retryable(error) ? Effect.fail(new InboxUnavailable({ cause: error })) : Effect.die(error)))

/** The server render has no session; the Inbox loads once the page runs in the browser */
const inBrowser = <A, E, R>(effect: Effect.Effect<A, E, R>) => (typeof window === "undefined" ? Effect.never : effect)

export const HttpInbox = Layer.effect(
  InboxRepository,
  Effect.gen(function*() {
    const client = yield* ApiClient
    const api = client.inbox

    return InboxRepository.of({
      list: inBrowser(classify(api.list())).pipe(Effect.withSpan("InboxRepository.list")),
      capture: (command) => classify(api.capture({ payload: command })).pipe(Effect.withSpan("InboxRepository.capture")),
      discard: (itemId) => classify(api.discard({ params: { itemId } })).pipe(Effect.withSpan("InboxRepository.discard"))
    })
  })
).pipe(Layer.provide(ApiClient.layer))
