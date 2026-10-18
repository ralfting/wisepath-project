import type { Effect } from "effect"
import { Context } from "effect"
import type { NotAdmin, PathNotFound, PathsUnavailable } from "./errors"
import type { PathId } from "./Path"
import type { PendingPublication } from "./publication"

/**
 * WisePath's administrators reviewing requests to publish paths to the catalog
 * (docs/plans/19-publish-to-the-catalog.md). Anyone else gets NotAdmin; a request no longer waiting, PathNotFound.
 */
export class PublicationReview extends Context.Service<PublicationReview, {
  readonly pending: () => Effect.Effect<ReadonlyArray<PendingPublication>, NotAdmin | PathsUnavailable>
  readonly approve: (id: PathId) => Effect.Effect<void, NotAdmin | PathNotFound | PathsUnavailable>
  readonly decline: (id: PathId) => Effect.Effect<void, NotAdmin | PathNotFound | PathsUnavailable>
}>()("@wisepath/domain/paths/PublicationReview") {}
