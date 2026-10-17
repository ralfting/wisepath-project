import "server-only"
import { cache } from "react"
import { Effect, Exit, Schema } from "effect"
import { PathId, PathRepository } from "@wisepath/domain/paths"
import { runServer } from "../server"

/** Path reads for Server Components */

/** The map's title, read with the learner's session; null when it can't be read (no session, gone, API down) */
export const pathTitle = cache(async (pathId: string): Promise<string | null> => {
  const exit = await runServer(
    Schema.decodeUnknownEffect(PathId)(pathId).pipe(
      Effect.flatMap((id) => PathRepository.use((repo) => repo.get(id))),
      Effect.map((path) => path.title),
      Effect.withSpan("useCases.paths.title")
    )
  )
  return Exit.isSuccess(exit) ? exit.value : null
})
