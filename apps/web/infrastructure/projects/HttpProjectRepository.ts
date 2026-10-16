import { Effect, Layer, Predicate } from "effect"
import { HttpClientError } from "effect/http"
import { ProjectRepository, ProjectsUnavailable } from "@wisepath/domain/projects"
import type { DefaultProjectProtected, ProjectNotFound } from "@wisepath/domain/projects"
import { ApiClient } from "../http/ApiClient"

/**
 * Projects kept by the WisePath API, through the client generated from the
 * contract. As in HttpPathRepository: domain errors arrive as themselves,
 * what may work on a second try becomes ProjectsUnavailable, the rest is a bug.
 */

type DomainError = ProjectNotFound | DefaultProjectProtected
const domainTags: ReadonlyArray<string> = ["ProjectNotFound", "DefaultProjectProtected"]
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
      create: (command) => classify(api.create({ payload: command })).pipe(Effect.withSpan("ProjectRepository.create")),
      rename: (projectId, edit) =>
        classify(api.rename({ params: { projectId }, payload: edit })).pipe(Effect.withSpan("ProjectRepository.rename")),
      remove: (projectId) => classify(api.remove({ params: { projectId } })).pipe(Effect.withSpan("ProjectRepository.remove"))
    })
  })
).pipe(Layer.provide(ApiClient.layer))
