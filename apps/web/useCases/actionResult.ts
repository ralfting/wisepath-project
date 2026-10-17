import { Effect, Exit, Option } from "effect"
import type { Auth } from "@wisepath/domain/auth"
import type { Translate } from "@/i18n/I18nProvider"
import { requireSession } from "./auth/programs"
import { translateDomainMessage } from "./domainMessages"
import { messageFor } from "./messages"

/**
 * What a Server Action answers: its value, or the failure's tag and the one
 * sentence to show, already in the learner's language. Plain data, so it
 * crosses to the client; causes and stacks stay on the server.
 */
export type ActionResult<A> =
  | { readonly ok: true; readonly value: A }
  | { readonly ok: false; readonly _tag: string; readonly message: string }

/** A use case's end as an ActionResult; tags not in `messages` get the generic sentence, defects included */
export function toActionResult<A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>,
  messages: Partial<Record<E["_tag"], string>>,
  t: Translate
): ActionResult<A> {
  if (Exit.isSuccess(exit)) return { ok: true, value: exit.value }
  const error = Exit.findErrorOption(exit)
  const generic = t("common.errors.generic")
  const message = translateDomainMessage(t)(messageFor(exit, messages, generic)) ?? generic
  return { ok: false, _tag: Option.isSome(error) ? error.value._tag : "Defect", message }
}

/**
 * A whole Server Action as an Effect that never fails: the session first, then the use case, then its answer.
 * The session check reaches the API before anything else, so an outage shows as AuthUnavailable here.
 */
export const actionAnswer = <A, E extends { readonly _tag: string }, R>(
  program: Effect.Effect<A, E, R>,
  t: Translate,
  messages: Partial<Record<string, string>>
): Effect.Effect<ActionResult<A>, never, R | Auth> =>
  Effect.exit(requireSession(program)).pipe(
    Effect.map((exit) =>
      toActionResult<A, { readonly _tag: string }>(
        exit,
        { NotAuthenticated: t("common.errors.signedOut"), AuthUnavailable: t("common.errors.unavailable"), ...messages },
        t
      )
    )
  )
