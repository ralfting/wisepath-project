import { Effect, Layer, Predicate } from "effect"
import { HttpClientError } from "effect/http"
import { Reviews, ReviewUnavailable } from "@wisepath/domain/review"
import type { CardNotFound } from "@wisepath/domain/review"
import { ApiClient } from "../http/ApiClient"

/**
 * Reviews kept by the WisePath API, through the client generated from the
 * contract. CardNotFound arrives as itself; anything that may work on a second
 * try (no connection, a server error, an expired session) becomes
 * ReviewUnavailable; anything else is a bug and becomes a defect.
 */

const retryable = (error: unknown) => {
  if (HttpClientError.isHttpClientError(error)) {
    const status = error.response?.status
    return status === undefined || status >= 500 || status === 408 || status === 429
  }
  return Predicate.isTagged(error, "NotAuthenticated")
}

const classify = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, Extract<E, CardNotFound> | ReviewUnavailable, R> =>
  Effect.catch(effect, (error): Effect.Effect<never, Extract<E, CardNotFound> | ReviewUnavailable> =>
    Predicate.isTagged(error, "CardNotFound")
      ? Effect.fail(error as Extract<E, CardNotFound>)
      : retryable(error)
        ? Effect.fail(new ReviewUnavailable({ cause: error }))
        : Effect.die(error)
  )

/** The server render has no session; reviews load once the page runs in the browser */
const inBrowser = <A, E, R>(effect: Effect.Effect<A, E, R>) => (typeof window === "undefined" ? Effect.never : effect)

export const HttpReviews = Layer.effect(
  Reviews,
  Effect.gen(function*() {
    const client = yield* ApiClient
    const api = client.review

    return Reviews.of({
      due: ({ projectId, dayEnds }) =>
        inBrowser(classify(api.due({ query: { dayEnds: dayEnds.toISOString(), ...(projectId ? { projectId } : {}) } }))).pipe(
          Effect.withSpan("Reviews.due")
        ),
      counts: ({ dayEnds }) => inBrowser(classify(api.counts({ query: { dayEnds: dayEnds.toISOString() } }))).pipe(Effect.withSpan("Reviews.counts")),
      grade: (cardId, command) => classify(api.grade({ params: { cardId }, payload: command })).pipe(Effect.withSpan("Reviews.grade"))
    })
  })
).pipe(Layer.provide(ApiClient.layer))
