import "server-only"
import { Effect, Layer, ManagedRuntime, Ref } from "effect"
import type { Exit } from "effect"
import { FetchHttpClient } from "effect/http"
import type { Cookies, HttpClient } from "effect/http"
import type { Auth } from "@wisepath/domain/auth"
import type { PathRepository } from "@wisepath/domain/paths"
import type { ProjectRepository } from "@wisepath/domain/projects"
import { ServerAuth } from "../auth/ApiAuth"
import { ServerPathRepository } from "../paths/HttpPathRepository"
import { ServerProjectRepository } from "../projects/HttpProjectRepository"
import { ResponseCookies, requestApiClient } from "./ServerApiClient"

/**
 * The services a use case gets on the Next server, wired for one request. Only
 * what server reads and actions use so far; add a service here when one needs it.
 */
export type ServerServices = Auth | PathRepository | ProjectRepository

/** The services over the API client of one request, which sends that request's cookies and keeps the ones set back */
export const ServerLayer = (cookie: string) =>
  Layer.mergeAll(ServerAuth, ServerPathRepository, ServerProjectRepository).pipe(
    Layer.provide(requestApiClient(cookie)),
    Layer.provideMerge(ResponseCookies.layer)
  )

/** How a use case ended on the server, and the cookies the API set meanwhile */
export interface ServerRun<A, E> {
  readonly exit: Exit.Exit<A, E>
  readonly cookies: Cookies.Cookies
}

/**
 * A runner over a runtime that holds only the HTTP client: nothing about a request or a learner lives in it. Each
 * run builds ServerLayer for its own cookie. Tests pass a recording HTTP client; the app passes fetch.
 */
export const serverRunner = (http: Layer.Layer<HttpClient.HttpClient>) => {
  const runtime = ManagedRuntime.make(http)
  return <A, E>(program: Effect.Effect<A, E, ServerServices>, cookie: string): Promise<ServerRun<A, E>> =>
    runtime.runPromise(
      Effect.gen(function*() {
        const exit = yield* Effect.exit(program)
        const cookies = yield* Ref.get(yield* ResponseCookies)
        return { exit, cookies }
      }).pipe(Effect.provide(ServerLayer(cookie)))
    )
}

/** Runs a use case for the request whose cookies are given */
export const runOnServer = serverRunner(FetchHttpClient.layer)
