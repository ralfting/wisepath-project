import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Ref } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { PathId, PathRepository, samplePath } from "@wisepath/domain/paths"
import { serverApiBaseUrl } from "../http/ApiClient"
import { ServerLayer } from "./ServerLayer"

/**
 * What the Next server sends the API for one request: its cookies, to the
 * server's base URL, and nothing carried over from another request.
 */

interface Sent {
  readonly url: string
  readonly cookie: string | undefined
}

/** An API that answers every call with the sample map and remembers what it was sent */
const recordingApi = Effect.gen(function*() {
  const sent = yield* Ref.make<ReadonlyArray<Sent>>([])
  const client = HttpClient.make((request, url) =>
    Ref.update(sent, (all) => [...all, { url: url.toString(), cookie: request.headers["cookie"] }]).pipe(
      Effect.as(
        HttpClientResponse.fromWeb(request, new Response(JSON.stringify(samplePath), { headers: { "content-type": "application/json" } }))
      )
    )
  )
  return { sent, layer: Layer.succeed(HttpClient.HttpClient)(client) }
})

const readMap = (cookie: string, api: Layer.Layer<HttpClient.HttpClient>) =>
  PathRepository.use((repo) => repo.get(PathId.make(samplePath.id))).pipe(Effect.provide(ServerLayer(cookie)), Effect.provide(api))

describe("ServerLayer", () => {
  it.effect("reads a map with the request's cookies, from the server's API address", () =>
    Effect.gen(function*() {
      const api = yield* recordingApi
      const path = yield* readMap("access_token=ada; wp-locale=pt-BR", api.layer)
      const [call] = yield* Ref.get(api.sent)
      assert.strictEqual(path.title, samplePath.title)
      assert.strictEqual(call.url, `${serverApiBaseUrl}/paths/${samplePath.id}`)
      assert.strictEqual(call.cookie, "access_token=ada; wp-locale=pt-BR")
    }))

  it.effect("sends each request only its own session", () =>
    Effect.gen(function*() {
      const api = yield* recordingApi
      yield* readMap("access_token=ada", api.layer)
      yield* readMap("access_token=lin", api.layer)
      yield* readMap("", api.layer)
      assert.deepStrictEqual((yield* Ref.get(api.sent)).map((call) => call.cookie), ["access_token=ada", "access_token=lin", ""])
    }))
})
