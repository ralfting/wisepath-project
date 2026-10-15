"use client"

import { Schema } from "effect"
import { AsyncResult, Atom } from "effect/reactivity"
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Credentials, SignupDetails } from "@wisepath/domain/auth"
import type { User } from "@wisepath/domain/auth"
import { useT } from "@/i18n/I18nProvider"
import { ReactivityKeys, appRuntime } from "../runtime"
import { messageFor } from "../messages"
import { useDomainMessage } from "../validation"
import * as programs from "./programs"

/**
 * Account use cases: who is logged in, logging in, signing up, logging out.
 * Features call the hooks; the atoms and Effect stay inside this folder.
 */

const sessionAtom = appRuntime.atom(programs.currentUser).pipe(Atom.withReactivity([ReactivityKeys.session]))
const loginAtom = appRuntime.fn(programs.login, { reactivityKeys: [ReactivityKeys.session] })
const signupAtom = appRuntime.fn(programs.signup, { reactivityKeys: [ReactivityKeys.session] })
const logoutAtom = appRuntime.fn(programs.logout, { reactivityKeys: [ReactivityKeys.session] })
const settingsAtom = appRuntime.fn(programs.updateSettings, { reactivityKeys: [ReactivityKeys.session] })

export type Session =
  | { readonly status: "loading" }
  | { readonly status: "signedIn"; readonly user: User }
  | { readonly status: "signedOut" }
  | { readonly status: "unavailable" }

/** The current session, kept fresh whenever someone logs in or out */
export function useSession(): Session {
  return useAtomValue(sessionAtom, (result): Session =>
    AsyncResult.match(result, {
      onInitial: () => ({ status: "loading" }),
      onFailure: () => ({ status: "unavailable" }),
      onSuccess: ({ value }) => (value._tag === "Some" ? { status: "signedIn", user: value.value } : { status: "signedOut" })
    })
  )
}

/** Result of an account action: null when it worked, otherwise the message to show */
export type ActionError = string | null

/** Logs in; resolves to null on success or a message to show */
export function useLogin(): (input: { email: string; password: string }) => Promise<ActionError> {
  const run = useAtomSet(loginAtom, { mode: "promiseExit" })
  const t = useT()
  const domain = useDomainMessage()
  return async (input) =>
    domain(
      messageFor(
        await run(input),
        { InvalidCredentials: t("auth.errors.invalidCredentials"), AuthUnavailable: t("common.errors.unavailable") },
        t("common.errors.generic")
      )
    )
}

/** Creates an account; resolves to null on success or a message to show */
export function useSignup(): (input: { name: string; email: string; password: string }) => Promise<ActionError> {
  const run = useAtomSet(signupAtom, { mode: "promiseExit" })
  const t = useT()
  const domain = useDomainMessage()
  return async (input) =>
    domain(
      messageFor(
        await run(input),
        { EmailAlreadyRegistered: t("auth.errors.emailTaken"), AuthUnavailable: t("common.errors.unavailable") },
        t("common.errors.generic")
      )
    )
}

/** Logs out; failures are ignored because the session is dropped either way */
export function useLogout(): () => Promise<void> {
  const run = useAtomSet(logoutAtom, { mode: "promiseExit" })
  return async () => {
    await run()
  }
}

/** Saves the language on the account (null: follow the browser); a failure leaves it for this browser only */
export function useSaveLocale(): (locale: string | null) => Promise<void> {
  const run = useAtomSet(settingsAtom, { mode: "promiseExit" })
  return async (locale) => {
    await run({ locale })
  }
}

/** Form validators built from the domain schemas, in the Standard Schema shape form libraries accept */
export const loginFormSchema = Schema.toStandardSchemaV1(Credentials)
export const signupFormSchema = Schema.toStandardSchemaV1(SignupDetails)
