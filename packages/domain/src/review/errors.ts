import { Schema } from "effect"

/**
 * What can go wrong in a review. Errors the API answers with say which HTTP
 * status, so the contract and the server agree on it.
 */

/** No page of the learner's has this card (its line was edited or removed since it was shown) */
export class CardNotFound extends Schema.TaggedError<CardNotFound>()("CardNotFound", {
  cardId: Schema.String
}, { httpApiStatus: 404 }) {}

/** Reviews could not be reached right now (network, server down); trying again may work */
export class ReviewUnavailable extends Schema.TaggedError<ReviewUnavailable>()("ReviewUnavailable", {
  cause: Schema.Defect()
}) {}
