import { Effect, Predicate } from "effect"
import { HttpClientError } from "effect/http"
import { PathsUnavailable } from "@wisepath/domain/paths"
import type { CannotShareWithSelf, NotAdmin, PageNotFound, PathNotFound, RootPageProtected, TitleTaken } from "@wisepath/domain/paths"
import type { ProjectNotFound } from "@wisepath/domain/projects"

/**
 * How the paths Layers read the API's answers. Domain errors arrive as
 * themselves (TitleTaken, PageNotFound, …). Anything that may work on a second
 * try (no connection, a server error, an expired session) becomes
 * PathsUnavailable; anything else, like a request the server rejects as
 * malformed, is a bug and becomes a defect.
 */

type DomainError = PathNotFound | PageNotFound | TitleTaken | RootPageProtected | ProjectNotFound | CannotShareWithSelf | NotAdmin
const domainTags: ReadonlyArray<string> = [
  "PathNotFound",
  "PageNotFound",
  "TitleTaken",
  "RootPageProtected",
  "ProjectNotFound",
  "CannotShareWithSelf",
  "NotAdmin"
]
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
export const classify = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, Extract<E, DomainError> | PathsUnavailable, R> =>
  Effect.catch(effect, (error): Effect.Effect<never, Extract<E, DomainError> | PathsUnavailable> =>
    isDomainError(error)
      ? Effect.fail(error as Extract<E, DomainError>)
      : retryable(error)
        ? Effect.fail(new PathsUnavailable({ cause: error }))
        : Effect.die(error)
  )

/** The server render of a client component has no session; paths load once the page runs in the browser */
export const inBrowser = <A, E, R>(effect: Effect.Effect<A, E, R>) => (typeof window === "undefined" ? Effect.never : effect)
export const anywhere = <A, E, R>(effect: Effect.Effect<A, E, R>) => effect
