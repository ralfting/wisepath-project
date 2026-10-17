import "server-only"
import { Effect, Layer, ManagedRuntime } from "effect"
import type { Exit } from "effect"
import { FetchHttpClient } from "effect/http"
import type { HttpClient } from "effect/http"
import type { Auth } from "@wisepath/domain/auth"
import type { PathRepository } from "@wisepath/domain/paths"
import type { ProjectRepository } from "@wisepath/domain/projects"
import { ServerAuth } from "../auth/ApiAuth"
import { ServerPathRepository } from "../paths/HttpPathRepository"
import { ServerProjectRepository } from "../projects/HttpProjectRepository"
import { requestApiClient } from "./ServerApiClient"

/**
 * The services a use case gets on the Next server, wired for one request. Only
 * what server reads and actions use so far; add a service here when one needs it.
 */
export type ServerServices = Auth | PathRepository | ProjectRepository

/** The services over the API client of one request, which sends that request's cookies */
export const ServerLayer = (cookie: string) =>
  Layer.mergeAll(ServerAuth, ServerPathRepository, ServerProjectRepository).pipe(Layer.provide(requestApiClient(cookie)))

/**
 * A runner over a runtime that holds only the HTTP client: nothing about a request or a learner lives in it. Each
 * run builds ServerLayer for its own cookie. Tests pass a recording HTTP client; the app passes fetch.
 */
export const serverRunner = (http: Layer.Layer<HttpClient.HttpClient>) => {
  const runtime = ManagedRuntime.make(http)
  return <A, E>(program: Effect.Effect<A, E, ServerServices>, cookie: string): Promise<Exit.Exit<A, E>> =>
    runtime.runPromiseExit(program.pipe(Effect.provide(ServerLayer(cookie))))
}

/** Runs a use case for the request whose cookies are given; how it ended, for the caller to map */
export const runOnServer = serverRunner(FetchHttpClient.layer)
