"use client"

import { useCallback } from "react"
import { useT } from "@/i18n/I18nProvider"
import type { TranslationKey } from "@/i18n/I18nProvider"

/**
 * The domain's validation messages are English sentences (the schemas in
 * packages/domain). They are shown in the learner's language through this
 * lookup, keyed by the domain's text; one not listed here shows as it is.
 */
const DOMAIN_MESSAGES: Readonly<Record<string, TranslationKey>> = {
  "Enter a valid email address": "auth.validation.email",
  "Enter your password": "auth.validation.password",
  "Tell us your name": "auth.validation.name",
  "Use at least 8 characters": "auth.validation.passwordLength",
  "Give the map a name": "home.create.nameRequired"
}

/** Turns a domain validation message into the current language; null and undefined pass through */
export type DomainMessage = <M extends string | null | undefined>(message: M) => M

export function useDomainMessage(): DomainMessage {
  const t = useT()
  return useCallback(
    <M extends string | null | undefined>(message: M): M => {
      const key = message ? DOMAIN_MESSAGES[message] : undefined
      return (key ? t(key) : message) as M
    },
    [t]
  )
}
