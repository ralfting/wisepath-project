import { Effect, Layer, Predicate } from "effect"
import { HttpClientError } from "effect/http"
import { PathRepository, PathsUnavailable } from "@wisepath/domain/paths"
import type { PageNotFound, PathNotFound, RootPageProtected, TitleTaken } from "@wisepath/domain/paths"
import type { ProjectNotFound } from "@wisepath/domain/projects"
import { ApiClient } from "../http/ApiClient"

/**
 * Paths kept by the WisePath API, through the client generated from the
 * contract. Domain errors arrive as themselves (TitleTaken, PageNotFound, …).
 * Anything that may work on a second try (no connection, a server error, an
 * expired session) becomes PathsUnavailable; anything else, like a request
 * the server rejects as malformed, is a bug and becomes a defect.
 */

type DomainError = PathNotFound | PageNotFound | TitleTaken | RootPageProtected | ProjectNotFound
const domainTags: ReadonlyArray<string> = ["PathNotFound", "PageNotFound", "TitleTaken", "RootPageProtected", "ProjectNotFound"]
const isDomainError = (error: unknown): error is DomainError =>
  Predicate.hasProperty(error, "_tag") && domainTags.includes(String(error._tag))

const retryable = (error: unknown) => {
  if (HttpClientError.isHttpClientError(error)) {
    const status = error.response?.status
    return status === undefined || status >= 500 || status === 408 || status === 429
  }
  return Predicate.isTagged(error, "NotAuthenticated")
}

/** Keeps the domain errors, retries what may pass later, and dies on the rest */
const classify = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, Extract<E, DomainError> | PathsUnavailable, R> =>
  Effect.catch(effect, (error): Effect.Effect<never, Extract<E, DomainError> | PathsUnavailable> =>
    isDomainError(error)
      ? Effect.fail(error as Extract<E, DomainError>)
      : retryable(error)
        ? Effect.fail(new PathsUnavailable({ cause: error }))
        : Effect.die(error)
  )

/** The server render has no session; paths load once the page runs in the browser */
const inBrowser = <A, E, R>(effect: Effect.Effect<A, E, R>) => (typeof window === "undefined" ? Effect.never : effect)

export const HttpPathRepository = Layer.effect(
  PathRepository,
  Effect.gen(function*() {
    const client = yield* ApiClient
    const api = client.paths

    return PathRepository.of({
      list: inBrowser(classify(api.list())).pipe(Effect.withSpan("PathRepository.list")),
      get: (pathId) => inBrowser(classify(api.get({ params: { pathId } }))).pipe(Effect.withSpan("PathRepository.get")),
      create: (command) => classify(api.create({ payload: command })).pipe(Effect.withSpan("PathRepository.create")),
      update: (pathId, edit) =>
        classify(api.update({ params: { pathId }, payload: edit })).pipe(Effect.withSpan("PathRepository.update")),
      remove: (pathId) => classify(api.remove({ params: { pathId } })).pipe(Effect.withSpan("PathRepository.remove")),
      createPage: (pathId, command) =>
        classify(api.createPage({ params: { pathId }, payload: command })).pipe(Effect.withSpan("PathRepository.createPage")),
      updatePage: (pathId, pageId, edit) =>
        classify(api.updatePage({ params: { pathId, pageId }, payload: edit })).pipe(
          Effect.withSpan("PathRepository.updatePage")
        ),
      removePage: (pathId, pageId) =>
        classify(api.removePage({ params: { pathId, pageId } })).pipe(Effect.withSpan("PathRepository.removePage"))
    })
  })
).pipe(Layer.provide(ApiClient.layer))
