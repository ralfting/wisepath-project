import { Effect, Layer } from "effect"
import { AccessNotices } from "@wisepath/domain/paths"
import { ApiClient } from "../http/ApiClient"
import { anywhere, classify, inBrowser } from "./classify"

/** The learner's notices of paths they lost, through the WisePath API's client; errors read as classify says */
const make = (reads: typeof inBrowser) =>
  Layer.effect(
    AccessNotices,
    Effect.gen(function*() {
      const api = (yield* ApiClient).notices
      return AccessNotices.of({
        list: reads(classify(api.list())).pipe(Effect.withSpan("AccessNotices.list")),
        dismiss: (noticeId) => classify(api.dismiss({ params: { noticeId } })).pipe(Effect.withSpan("AccessNotices.dismiss"))
      })
    })
  )

/** In the browser, which sends the session cookie itself */
export const HttpAccessNotices = make(inBrowser).pipe(Layer.provide(ApiClient.layer))

/** On the Next server, over the ApiClient of the request it serves */
export const ServerAccessNotices = make(anywhere)
