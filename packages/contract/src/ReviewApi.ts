import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api"
import { NotAuthenticated } from "@wisepath/domain/auth"
import { PathId } from "@wisepath/domain/paths"
import { CardId, CardNotFound, DueCard, GradeCard, ReviewCounts, ReviewState } from "@wisepath/domain/review"
import { InvalidRequest } from "./InvalidRequest"

/**
 * Spaced review of the cards written in the learner's pages (under
 * /api/review). Cards are read from the pages on every call; only their
 * review states are stored. `dayEnds` is the end of the learner's day (in
 * their time zone), so "due today" means today where they are.
 */

const day = { dayEnds: Schema.String }

export class ReviewApiGroup extends HttpApiGroup.make("review")
  .add(
    HttpApiEndpoint.get("due", "/due", {
      query: { ...day, pathId: Schema.optional(PathId) },
      success: Schema.Array(DueCard),
      error: [NotAuthenticated, InvalidRequest]
    }),
    HttpApiEndpoint.get("counts", "/counts", {
      query: day,
      success: ReviewCounts,
      error: [NotAuthenticated, InvalidRequest]
    }),
    HttpApiEndpoint.post("grade", "/:cardId", {
      params: { cardId: CardId },
      payload: GradeCard,
      success: ReviewState,
      error: [NotAuthenticated, InvalidRequest, CardNotFound]
    })
  )
  .prefix("/review") {}
