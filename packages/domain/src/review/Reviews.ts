import type { Effect } from "effect"
import { Context } from "effect"
import type { PathId } from "../paths/Path"
import type { CardId } from "./cards"
import type { CardNotFound, ReviewUnavailable } from "./errors"
import type { ReviewState } from "./fsrs"
import type { DueCard, GradeCard, ReviewCounts } from "./queue"

/**
 * Where reviews are kept: the WisePath API. The cards come from the pages
 * there; only their review states are stored. ReviewUnavailable means the API
 * could not be reached and the call can be made again.
 */
export class Reviews extends Context.Service<Reviews, {
  /** Today's cards, in one path or all of them; `dayEnds` is the end of the learner's day */
  readonly due: (options: { readonly pathId?: PathId; readonly dayEnds: Date }) => Effect.Effect<ReadonlyArray<DueCard>, ReviewUnavailable>
  readonly counts: (options: { readonly dayEnds: Date }) => Effect.Effect<ReviewCounts, ReviewUnavailable>
  readonly grade: (cardId: CardId, command: GradeCard) => Effect.Effect<ReviewState, CardNotFound | ReviewUnavailable>
}>()("@wisepath/domain/review/Reviews") {}
