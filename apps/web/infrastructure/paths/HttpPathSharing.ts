import { Effect, Layer } from "effect"
import { PathSharing } from "@wisepath/domain/paths"
import { ApiClient } from "../http/ApiClient"
import { anywhere, classify, inBrowser } from "./classify"

/** Sharing paths through the WisePath API's client; errors read as classify says */
const make = (reads: typeof inBrowser) =>
  Layer.effect(
    PathSharing,
    Effect.gen(function*() {
      const client = yield* ApiClient
      const api = client.paths

      return PathSharing.of({
        shares: (pathId) => reads(classify(api.shares({ params: { pathId } }))).pipe(Effect.withSpan("PathSharing.shares")),
        share: (pathId, edit) => classify(api.share({ params: { pathId }, payload: edit })).pipe(Effect.withSpan("PathSharing.share")),
        unshare: (pathId, userId) =>
          classify(api.unshare({ params: { pathId, userId } })).pipe(Effect.withSpan("PathSharing.unshare")),
        cancelInvite: (pathId, email) =>
          classify(api.cancelInvite({ params: { pathId }, query: { email } })).pipe(Effect.withSpan("PathSharing.cancelInvite")),
        setVisibility: (pathId, edit) =>
          classify(api.setVisibility({ params: { pathId }, payload: edit })).pipe(Effect.withSpan("PathSharing.setVisibility")),
        take: (pathId) => classify(api.take({ params: { pathId } })).pipe(Effect.withSpan("PathSharing.take")),
        leave: (pathId) => classify(api.leave({ params: { pathId } })).pipe(Effect.withSpan("PathSharing.leave")),
        requestPublication: (pathId, request) =>
          classify(api.requestPublication({ params: { pathId }, payload: request })).pipe(Effect.withSpan("PathSharing.requestPublication")),
        withdrawPublication: (pathId) =>
          classify(api.withdrawPublication({ params: { pathId } })).pipe(Effect.withSpan("PathSharing.withdrawPublication")),
        // No session needed, so it reads on the server render too
        readPublic: (pathId) => classify(client.publicPaths.get({ params: { pathId } })).pipe(Effect.withSpan("PathSharing.readPublic")),
        catalog: (filter) => classify(client.catalog.list({ query: filter })).pipe(Effect.withSpan("PathSharing.catalog")),
        readPublished: (slug) => classify(client.catalog.get({ params: { slug } })).pipe(Effect.withSpan("PathSharing.readPublished"))
      })
    })
  )

/** In the browser, which sends the session cookie itself */
export const HttpPathSharing = make(inBrowser).pipe(Layer.provide(ApiClient.layer))

/** On the Next server, over the ApiClient of the request it serves */
export const ServerPathSharing = make(anywhere)
