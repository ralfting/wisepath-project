import { describe, expect, it } from "vitest"
import { Effect, Exit, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { PathId, PathRepository, samplePath } from "@wisepath/domain/paths"
import { serverBaseUrl } from "./ServerApiClient"
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

/** The session the API starts for a request that comes without one, as a login does */
const SESSION = "access_token=fresh; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400"

/**
 * An API that answers every call with the sample map after a short wait, starts a session for a request without
 * one, and remembers what it was sent
 */
function recordingApi() {
  const sent: Array<Sent> = []
  const client = HttpClient.make((request, url) =>
    Effect.sync(() => sent.push({ url: url.toString(), cookie: request.headers["cookie"] })).pipe(
      Effect.andThen(Effect.sleep("5 millis")),
      Effect.as(
        HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify(samplePath), {
            headers: { "content-type": "application/json", ...(request.headers["cookie"] ? {} : { "set-cookie": SESSION }) }
          })
        )
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

    const runs = await Promise.all(cookies.map((cookie) => run(readTitle, cookie)))

    expect(runs.map(({ exit }) => Exit.isSuccess(exit) && exit.value)).toEqual(cookies.map(() => samplePath.title))
    expect(api.sent.map((call) => call.cookie).sort()).toEqual([...cookies].sort())
    expect(api.sent.every((call) => call.url.endsWith(`/paths/${samplePath.id}`))).toBe(true)
  })

  it("keeps the cookies the API sets, with its flags, for that request only", async () => {
    const run = serverRunner(recordingApi().layer)

    const [signedIn, fresh] = await Promise.all([run(readTitle, "access_token=ada"), run(readTitle, "")])

    expect(Object.keys(signedIn.cookies.cookies)).toEqual([])
    const session = fresh.cookies.cookies["access_token"]
    expect([session?.value, session?.options?.httpOnly, session?.options?.sameSite, session?.options?.path]).toEqual(["fresh", true, "lax", "/"])
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
