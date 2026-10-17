import { Context, Layer, Schedule } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http"
import { HttpApiClient } from "effect/http-api"
import { WisePathApi } from "@wisepath/contract"

/** Base URL of the WisePath API; NEXT_PUBLIC_* is inlined by Next at build time */
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/api"

/**
 * The same API as seen from the Next server. In production the browser's URL is relative ("/api", rewritten by
 * next.config.js), which the server can't fetch, so it goes to API_ORIGIN, the rewrite's own target.
 */
export const serverApiBaseUrl = process.env.API_ORIGIN
  ? `${process.env.API_ORIGIN}/api`
  : apiBaseUrl.startsWith("http")
    ? apiBaseUrl
    : "http://localhost:4001/api"

/** Typed client for the WisePath API, generated from the shared contract */
export class ApiClient extends Context.Service<ApiClient, HttpApiClient.ForApi<typeof WisePathApi>>()(
  "@wisepath/web/infrastructure/http/ApiClient"
) {
  static readonly layer = Layer.effect(
    ApiClient,
    HttpApiClient.make(WisePathApi, {
      transformClient: (client) =>
        client.pipe(
          HttpClient.mapRequest(HttpClientRequest.prependUrl(apiBaseUrl)),
          HttpClient.retryTransient({ schedule: Schedule.exponential(100), times: 2 })
        )
    })
  ).pipe(
    Layer.provide(FetchHttpClient.layer),
    // The session lives in an httpOnly cookie set by the API, so every request sends credentials
    Layer.provideMerge(Layer.succeed(FetchHttpClient.RequestInit, { credentials: "include" }))
  )

  /**
   * The client for one request on the Next server, sending that request's cookies (the session among them).
   * Built per request and never kept: a shared one would carry one learner's session into another's request.
   */
  static readonly forRequest = (cookie: string) =>
    Layer.effect(
      ApiClient,
      HttpApiClient.make(WisePathApi, {
        transformClient: (client) =>
          client.pipe(
            HttpClient.mapRequest((request) => request.pipe(HttpClientRequest.prependUrl(serverApiBaseUrl), HttpClientRequest.setHeader("cookie", cookie))),
            HttpClient.retryTransient({ schedule: Schedule.exponential(100), times: 2 })
          )
      })
    )
}
