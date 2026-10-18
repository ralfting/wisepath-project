import { Schema } from "effect"
import { PathLanguage } from "./access"
import { PathId } from "./Path"

/**
 * Publishing a path to the catalog (docs/plans/19-publish-to-the-catalog.md). The owner asks; a WisePath
 * administrator approves or declines; until then the path keeps its visibility.
 */

/** What the owner tells the catalog about the path when asking to publish it */
export const PublicationRequest = Schema.Struct({
  description: Schema.Trim.check(Schema.isMinLength(1, { message: "Say what the path teaches" })),
  audience: Schema.Trim.check(Schema.isMinLength(1, { message: "Say who the path is for" })),
  language: PathLanguage
})
export type PublicationRequest = typeof PublicationRequest.Type

/** A request as an administrator reviews it */
export const PendingPublication = Schema.Struct({
  pathId: PathId,
  title: Schema.String,
  description: Schema.String,
  audience: Schema.String,
  language: PathLanguage,
  pages: Schema.Number,
  ownerName: Schema.NullOr(Schema.String),
  ownerEmail: Schema.String,
  /** ISO date */
  requestedAt: Schema.String
})
export type PendingPublication = typeof PendingPublication.Type
