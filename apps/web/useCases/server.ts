import "server-only"
import { cookies } from "next/headers"
import { Duration } from "effect"
import type { Effect, Exit } from "effect"
import type { Cookies } from "effect/http"
import type { NotAuthenticated } from "@wisepath/domain/auth"
import { runOnServer } from "@/infrastructure/server/ServerLayer"
import type { ServerServices } from "@/infrastructure/server/ServerLayer"
import type { Translate } from "@/i18n/I18nProvider"
import { serverT } from "@/i18n/server"
import { toActionResult } from "./actionResult"
import type { ActionResult } from "./actionResult"
import { requireSession } from "./auth/programs"

/** A use case run as the learner of the current request: its cookies (the session among them) go to the API */
async function asLearner<A, E>(program: Effect.Effect<A, E, ServerServices>) {
  return runOnServer(program, (await cookies()).toString())
}

/**
 * Runs a use case on the Next server as the learner of the current request.
 * The API checks the session on every call. The edge for queries.ts.
 */
export async function runServer<A, E>(program: Effect.Effect<A, E, ServerServices>): Promise<Exit.Exit<A, E>> {
  return (await asLearner(program)).exit
}

/**
 * Hands the browser the cookies the API set (a login's session, a logout's clearing), with the API's own flags:
 * the browser only talked to the Next server, so it never saw them. Only actions may set cookies.
 */
async function passOn(received: Cookies.Cookies) {
  const store = await cookies()
  for (const cookie of Object.values(received.cookies)) {
    const { httpOnly, secure, sameSite, path, expires, maxAge } = cookie.options ?? {}
    store.set({
      name: cookie.name,
      value: cookie.value,
      httpOnly,
      secure,
      sameSite,
      path,
      expires,
      ...(maxAge !== undefined ? { maxAge: Duration.toSeconds(Duration.fromInputUnsafe(maxAge)) } : {})
    })
  }
}

type Messages<E extends { readonly _tag: string }> = (t: Translate) => Partial<Record<E["_tag"] | NotAuthenticated["_tag"], string>>

// The public edges check the tags `messages` names against the use case's errors; here any tag will do
async function answer<A, E extends { readonly _tag: string }>(
  program: Effect.Effect<A, E, ServerServices>,
  messages: (t: Translate) => Partial<Record<string, string>>
): Promise<ActionResult<A>> {
  const [t, run] = await Promise.all([serverT(), asLearner(program)])
  await passOn(run.cookies)
  return toActionResult<A, { readonly _tag: string }>(run.exit, { NotAuthenticated: t("common.errors.signedOut"), ...messages(t) }, t)
}

/**
 * The edge for Server Actions: checks the session first, runs the use case as
 * that learner, and answers with an ActionResult in the learner's language.
 * `messages` names the sentence for each failure the learner can act on.
 */
export async function runAction<A, E extends { readonly _tag: string }>(
  program: Effect.Effect<A, E, ServerServices>,
  messages: Messages<E>
): Promise<ActionResult<A>> {
  return answer(requireSession(program), messages)
}

/** The edge for the actions that come before a session: logging in, signing up, logging out */
export async function runPublicAction<A, E extends { readonly _tag: string }>(
  program: Effect.Effect<A, E, ServerServices>,
  messages: Messages<E>
): Promise<ActionResult<A>> {
  return answer(program, messages)
}
