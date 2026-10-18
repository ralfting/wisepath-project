import { Effect, Layer } from "effect"
import { PublicationReview } from "@wisepath/domain/paths"
import { ApiClient } from "../http/ApiClient"
import { classify } from "./classify"

/** Reviewing requests to publish through the WisePath API, on the Next server over the request's ApiClient */
export const ServerPublicationReview = Layer.effect(
  PublicationReview,
  Effect.gen(function*() {
    const api = (yield* ApiClient).admin

    return PublicationReview.of({
      pending: () => classify(api.publications()).pipe(Effect.withSpan("PublicationReview.pending")),
      approve: (pathId) => classify(api.approve({ params: { pathId } })).pipe(Effect.withSpan("PublicationReview.approve")),
      decline: (pathId) => classify(api.decline({ params: { pathId } })).pipe(Effect.withSpan("PublicationReview.decline"))
    })
  })
)
