import "server-only"
import { cache } from "react"
import { Cause, Exit, Option } from "effect"
import type { Path } from "@wisepath/domain/paths"
import { runServer } from "../server"
import * as programs from "./programs"

/** Path reads for Server Components */

/** The map's title, read with the learner's session; null when it can't be read (no session, gone, API down) */
export const pathTitle = cache(async (pathId: string): Promise<string | null> => {
  const exit = await runServer(programs.pathTitle(pathId))
  return Exit.isSuccess(exit) ? exit.value : null
})

/**
 * A public map, read without anyone's session: null when there is none (private, gone, or a malformed id). The API
 * being down is thrown, for the segment's error page.
 */
export const publicPath = cache(async (pathId: string): Promise<Path | null> => {
  const exit = await runServer(programs.readPublicPath(pathId))
  if (Exit.isSuccess(exit)) return exit.value
  const error = Cause.findErrorOption(exit.cause)
  if (Option.isSome(error) && error.value._tag !== "PathsUnavailable") return null
  throw new Error("The public map could not be read")
})
