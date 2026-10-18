import "server-only"
import { Layer, Schedule } from "effect"
import { HttpClient, HttpClientRequest } from "effect/http"
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

/** The site's own origin from SITE_URL ("https://wisepath.com.br"); none when unset or not an http(s) address */
export const siteOrigin = (value: string | undefined): string | null => {
  if (!value?.trim()) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null
  } catch {
    return null
  }
}

/**
 * Where WisePath lives once it has a domain of its own (docs/DEPLOY.md). Unset, nothing is offered to search
 * engines: no sitemap, robots.txt closes the site, and every page stays noindex
 */
export const siteUrl = siteOrigin(process.env.SITE_URL)

/**
 * The API client for one request on the Next server, sending that request's cookies (the session among them).
 * Built per request and never kept: a shared one would carry one learner's session into another's request.
 */
export const requestApiClient = (cookie: string) =>
  Layer.effect(
    ApiClient,
    HttpApiClient.make(WisePathApi, {
      transformClient: (client) =>
        client.pipe(
          HttpClient.mapRequest((request) => request.pipe(HttpClientRequest.prependUrl(baseUrl), HttpClientRequest.setHeader("cookie", cookie))),
          HttpClient.retryTransient({ schedule: Schedule.exponential(100), times: 2 })
        )
    })
  )
