import "server-only"
import { Context, Effect, Layer, Ref, Schedule } from "effect"
import { Cookies, HttpClient, HttpClientRequest } from "effect/http"
import { HttpApiClient } from "effect/http-api"
import { WisePathApi } from "@wisepath/contract"
import { ApiClient } from "../http/ApiClient"

const LOCAL_API = "http://localhost:4001/api"

/**
 * Where the Next server reaches the API. In production the browser's URL is relative ("/api", rewritten by
 * next.config.js), which a server can't fetch, so it goes to API_ORIGIN, the rewrite's own target.
 */
export const serverBaseUrl = (apiOrigin: string | undefined, publicApiUrl: string | undefined): string =>
  apiOrigin ? `${apiOrigin}/api` : publicApiUrl?.startsWith("http") ? publicApiUrl : LOCAL_API

/** Server-only config: API_ORIGIN never reaches the browser bundle */
const baseUrl = serverBaseUrl(process.env.API_ORIGIN, process.env.NEXT_PUBLIC_API_URL)

/**
 * The cookies the API set while serving one request (a login's session, a logout's clearing). A Server Action
 * passes them on to the browser, since the browser never saw the API's answer itself.
 */
export class ResponseCookies extends Context.Service<ResponseCookies, Ref.Ref<Cookies.Cookies>>()(
  "@wisepath/web/infrastructure/server/ResponseCookies"
) {
  static readonly layer = Layer.effect(ResponseCookies, Ref.make(Cookies.empty))
}

/**
 * The API client for one request on the Next server, sending that request's cookies (the session among them) and
 * keeping the ones the API sets. Built per request and never kept: a shared one would carry one learner's
 * session into another's request.
 */
export const requestApiClient = (cookie: string) =>
  Layer.effect(
    ApiClient,
    Effect.gen(function*() {
      const received = yield* ResponseCookies
      return yield* HttpApiClient.make(WisePathApi, {
        transformClient: (client) =>
          client.pipe(
            HttpClient.mapRequest((request) => request.pipe(HttpClientRequest.prependUrl(baseUrl), HttpClientRequest.setHeader("cookie", cookie))),
            HttpClient.tap((response) => Ref.update(received, Cookies.merge(response.cookies))),
            HttpClient.retryTransient({ schedule: Schedule.exponential(100), times: 2 })
          )
      })
    })
  )
