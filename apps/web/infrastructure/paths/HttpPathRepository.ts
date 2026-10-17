import { Effect, Layer } from "effect"
import { PathRepository } from "@wisepath/domain/paths"
import { ApiClient } from "../http/ApiClient"
import { anywhere, classify, inBrowser } from "./classify"

/** Paths kept by the WisePath API, through the client generated from the contract; errors read as classify says */
const make = (reads: typeof inBrowser) =>
  Layer.effect(
    PathRepository,
    Effect.gen(function*() {
      const client = yield* ApiClient
      const api = client.paths

      return PathRepository.of({
        list: reads(classify(api.list())).pipe(Effect.withSpan("PathRepository.list")),
        get: (pathId) => reads(classify(api.get({ params: { pathId } }))).pipe(Effect.withSpan("PathRepository.get")),
        create: (command) => classify(api.create({ payload: command })).pipe(Effect.withSpan("PathRepository.create")),
        update: (pathId, edit) =>
          classify(api.update({ params: { pathId }, payload: edit })).pipe(Effect.withSpan("PathRepository.update")),
        remove: (pathId) => classify(api.remove({ params: { pathId } })).pipe(Effect.withSpan("PathRepository.remove")),
        createPage: (pathId, command) =>
          classify(api.createPage({ params: { pathId }, payload: command })).pipe(Effect.withSpan("PathRepository.createPage")),
        updatePage: (pathId, pageId, edit) =>
          classify(api.updatePage({ params: { pathId, pageId }, payload: edit })).pipe(
            Effect.withSpan("PathRepository.updatePage")
          ),
        removePage: (pathId, pageId) =>
          classify(api.removePage({ params: { pathId, pageId } })).pipe(Effect.withSpan("PathRepository.removePage"))
      })
    })
  )

/** In the browser, which sends the session cookie itself */
export const HttpPathRepository = make(inBrowser).pipe(Layer.provide(ApiClient.layer))

/** On the Next server, over the ApiClient of the request it serves (requestApiClient in infrastructure/server/ServerApiClient.ts) */
export const ServerPathRepository = make(anywhere)
