import "server-only"
import { Effect, Layer, ManagedRuntime } from "effect"
import type { Exit } from "effect"
import { FetchHttpClient } from "effect/http"
import type { PathRepository } from "@wisepath/domain/paths"
import { ApiClient } from "../http/ApiClient"
import { ServerPathRepository } from "../paths/HttpPathRepository"

/**
 * The services a use case gets on the Next server, wired for one request. Only
 * what Server Components read so far; add a service here when a query needs it.
 */
export type ServerServices = PathRepository

/** The services over the API client of one request, which sends that request's cookies */
export const ServerLayer = (cookie: string) => ServerPathRepository.pipe(Layer.provide(ApiClient.forRequest(cookie)))

/** What every request shares: the HTTP client. Nothing about a request or a learner lives here */
const runtime = ManagedRuntime.make(FetchHttpClient.layer)

/** Runs a use case for the request whose cookies are given; how it ended, for the caller to map */
export const runOnServer = <A, E>(program: Effect.Effect<A, E, ServerServices>, cookie: string): Promise<Exit.Exit<A, E>> =>
  runtime.runPromiseExit(program.pipe(Effect.provide(ServerLayer(cookie))))
