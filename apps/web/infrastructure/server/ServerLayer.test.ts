import { describe, expect, it } from "vitest"
import { Effect, Exit, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { PathId, PathRepository, samplePath } from "@wisepath/domain/paths"
import { serverBaseUrl, siteOrigin } from "./ServerApiClient"
import { serverRunner } from "./ServerLayer"

/**
 * What the Next server sends the API for one request: its cookies, and nothing
 * carried over from another request, even when requests overlap on the one
 * runtime they share.
 */

interface Sent {
  readonly url: string
  readonly cookie: string | undefined
}

/** An API that answers every call with the sample map after a short wait, and remembers what it was sent */
function recordingApi() {
  const sent: Array<Sent> = []
  const client = HttpClient.make((request, url) =>
    Effect.sync(() => sent.push({ url: url.toString(), cookie: request.headers["cookie"] })).pipe(
      Effect.andThen(Effect.sleep("5 millis")),
      Effect.as(
        HttpClientResponse.fromWeb(request, new Response(JSON.stringify(samplePath), { headers: { "content-type": "application/json" } }))
      )
    )
  )
  return { sent, layer: Layer.succeed(HttpClient.HttpClient)(client) }
}

const readTitle = PathRepository.use((repo) => repo.get(PathId.make(samplePath.id))).pipe(Effect.map((path) => path.title))

describe("serverRunner", () => {
  it("sends each request only its own cookies, even when requests overlap", async () => {
    const api = recordingApi()
    const run = serverRunner(api.layer)
    const cookies = ["access_token=ada", "access_token=lin; wp-locale=pt-BR", ""]

    const exits = await Promise.all(cookies.map((cookie) => run(readTitle, cookie)))

    expect(exits.map((exit) => Exit.isSuccess(exit) && exit.value)).toEqual(cookies.map(() => samplePath.title))
    expect(api.sent.map((call) => call.cookie).sort()).toEqual([...cookies].sort())
    expect(api.sent.every((call) => call.url.endsWith(`/paths/${samplePath.id}`))).toBe(true)
  })
})

describe("serverBaseUrl", () => {
  it.each([
    ["the rewrite's target in production", "https://api.wisepath.app", "/api", "https://api.wisepath.app/api"],
    ["the public URL when it is absolute", undefined, "http://localhost:4101/api", "http://localhost:4101/api"],
    ["the local API when the public URL is relative", undefined, "/api", "http://localhost:4001/api"],
    ["the local API when nothing is set", undefined, undefined, "http://localhost:4001/api"]
  ])("uses %s", (_case, apiOrigin, publicApiUrl, expected) => {
    expect(serverBaseUrl(apiOrigin, publicApiUrl)).toBe(expected)
  })
})

describe("siteOrigin", () => {
  it("keeps the origin of an http(s) address, and nothing for anything else", () => {
    expect(siteOrigin("https://wisepath.com.br/")).toBe("https://wisepath.com.br")
    expect(siteOrigin(" https://wisepath.com.br/p ")).toBe("https://wisepath.com.br")
    expect([siteOrigin(undefined), siteOrigin(""), siteOrigin("wisepath.com.br"), siteOrigin("ftp://wisepath.com.br")]).toEqual([
      null,
      null,
      null,
      null
    ])
  })
})
