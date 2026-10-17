import "server-only"
import { cookies } from "next/headers"
import type { Effect, Exit } from "effect"
import { runOnServer } from "@/infrastructure/server/ServerLayer"
import type { ServerServices } from "@/infrastructure/server/ServerLayer"

/**
 * Runs a use case on the Next server as the learner of the current request:
 * its cookies (the session among them) go with every call to the API, which
 * checks the session itself. The edge for queries.ts and actions.ts.
 */
export async function runServer<A, E>(program: Effect.Effect<A, E, ServerServices>): Promise<Exit.Exit<A, E>> {
  return runOnServer(program, (await cookies()).toString())
}
