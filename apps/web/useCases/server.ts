import "server-only"
import { cookies } from "next/headers"
import { Exit } from "effect"
import type { Effect } from "effect"
import type { AuthUnavailable, NotAuthenticated } from "@wisepath/domain/auth"
import { runOnServer } from "@/infrastructure/server/ServerLayer"
import type { ServerServices } from "@/infrastructure/server/ServerLayer"
import type { Translate } from "@/i18n/I18nProvider"
import { serverT } from "@/i18n/server"
import { actionAnswer } from "./actionResult"
import type { ActionResult } from "./actionResult"

/**
 * Runs a use case on the Next server as the learner of the current request:
 * its cookies (the session among them) go with every call to the API, which
 * checks the session itself. The edge for queries.ts and actions.ts.
 */
export async function runServer<A, E>(program: Effect.Effect<A, E, ServerServices>): Promise<Exit.Exit<A, E>> {
  return runOnServer(program, (await cookies()).toString())
}

/**
 * The edge for Server Actions: checks the session first, runs the use case as
 * that learner, and answers with an ActionResult in the learner's language
 * (actionAnswer). `messages` names the sentence for each failure the learner can act on.
 */
export async function runAction<A, E extends { readonly _tag: string }>(
  program: Effect.Effect<A, E, ServerServices>,
  messages: (t: Translate) => Partial<Record<E["_tag"] | NotAuthenticated["_tag"] | AuthUnavailable["_tag"], string>>
): Promise<ActionResult<A>> {
  const t = await serverT()
  const exit = await runServer(actionAnswer(program, t, messages(t)))
  // It only fails when interrupted
  return Exit.isSuccess(exit) ? exit.value : { ok: false, _tag: "Interrupted", message: t("common.errors.generic") }
}
