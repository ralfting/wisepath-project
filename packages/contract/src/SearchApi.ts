import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api"
import { NotAuthenticated } from "@wisepath/domain/auth"
import { SEARCH_MAX_LIMIT, SearchHit } from "@wisepath/domain/search"
import { InvalidRequest } from "./InvalidRequest"

/** How many results to return; the server's default when left out */
export const SearchLimit = Schema.FiniteFromString.pipe(Schema.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: SEARCH_MAX_LIMIT })))

/**
 * Search everywhere (under /api/search): the learner's pages in all their
 * maps whose title or text holds every word of `q`, ignoring case and
 * accents, best first. Someone else's pages are never found.
 */
export class SearchApiGroup extends HttpApiGroup.make("search")
  .add(
    HttpApiEndpoint.get("search", "/search", {
      query: { q: Schema.String, limit: Schema.optional(SearchLimit) },
      success: Schema.Array(SearchHit),
      error: [NotAuthenticated, InvalidRequest]
    })
  )
{}
