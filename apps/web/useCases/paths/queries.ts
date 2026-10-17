import "server-only"
import { cache } from "react"
import { Exit } from "effect"
import { runServer } from "../server"
import * as programs from "./programs"

/** Path reads for Server Components */

/** The map's title, read with the learner's session; null when it can't be read (no session, gone, API down) */
export const pathTitle = cache(async (pathId: string): Promise<string | null> => {
  const exit = await runServer(programs.pathTitle(pathId))
  return Exit.isSuccess(exit) ? exit.value : null
})
