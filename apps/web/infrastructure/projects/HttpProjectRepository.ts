import { Effect, Layer, Predicate } from "effect"
import { HttpClientError } from "effect/http"
import { ProjectRepository, ProjectsUnavailable } from "@wisepath/domain/projects"
import type { PageNotFound, ProjectNotFound, RootPageProtected, TitleTaken } from "@wisepath/domain/projects"
import { ApiClient } from "../http/ApiClient"

/**
 * Projects kept by the WisePath API, through the client generated from the
 * contract. Domain errors arrive as themselves (TitleTaken, PageNotFound, …).
 * Anything that may work on a second try (no connection, a server error, an
 * expired session) becomes ProjectsUnavailable; anything else, like a request
 * the server rejects as malformed, is a bug and becomes a defect.
 */

type DomainError = ProjectNotFound | PageNotFound | TitleTaken | RootPageProtected
const domainTags: ReadonlyArray<string> = ["ProjectNotFound", "PageNotFound", "TitleTaken", "RootPageProtected"]
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
const classify = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, Extract<E, DomainError> | ProjectsUnavailable, R> =>
  Effect.catch(effect, (error): Effect.Effect<never, Extract<E, DomainError> | ProjectsUnavailable> =>
    isDomainError(error)
      ? Effect.fail(error as Extract<E, DomainError>)
      : retryable(error)
        ? Effect.fail(new ProjectsUnavailable({ cause: error }))
        : Effect.die(error)
  )

/** The server render has no session; projects load once the page runs in the browser */
const inBrowser = <A, E, R>(effect: Effect.Effect<A, E, R>) => (typeof window === "undefined" ? Effect.never : effect)

export const HttpProjectRepository = Layer.effect(
  ProjectRepository,
  Effect.gen(function*() {
    const client = yield* ApiClient
    const api = client.projects

    return ProjectRepository.of({
      list: inBrowser(classify(api.list())).pipe(Effect.withSpan("ProjectRepository.list")),
      get: (projectId) => inBrowser(classify(api.get({ params: { projectId } }))).pipe(Effect.withSpan("ProjectRepository.get")),
      create: (command) => classify(api.create({ payload: command })).pipe(Effect.withSpan("ProjectRepository.create")),
      update: (projectId, edit) =>
        classify(api.update({ params: { projectId }, payload: edit })).pipe(Effect.withSpan("ProjectRepository.update")),
      remove: (projectId) => classify(api.remove({ params: { projectId } })).pipe(Effect.withSpan("ProjectRepository.remove")),
      createPage: (projectId, command) =>
        classify(api.createPage({ params: { projectId }, payload: command })).pipe(Effect.withSpan("ProjectRepository.createPage")),
      updatePage: (projectId, pageId, edit) =>
        classify(api.updatePage({ params: { projectId, pageId }, payload: edit })).pipe(
          Effect.withSpan("ProjectRepository.updatePage")
        ),
      removePage: (projectId, pageId) =>
        classify(api.removePage({ params: { projectId, pageId } })).pipe(Effect.withSpan("ProjectRepository.removePage"))
    })
  })
).pipe(Layer.provide(ApiClient.layer))
