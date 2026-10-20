import type { Translate, TranslationKey } from "@/i18n/I18nProvider"

/**
 * The domain's validation messages are English sentences (the schemas in
 * packages/domain). They are shown in the learner's language through this
 * lookup, keyed by the domain's text; one not listed here shows as it is.
 * Shared by the client (useDomainMessage) and Server Actions.
 */
const DOMAIN_MESSAGES: Readonly<Record<string, TranslationKey>> = {
  "Enter a valid email address": "auth.validation.email",
  "Enter your password": "auth.validation.password",
  "Tell us your name": "auth.validation.name",
  "Use at least 8 characters": "auth.validation.passwordLength",
  "Give the map a name": "home.create.nameRequired",
  "Leave [ and ] out of the title": "home.create.nameBrackets",
  "Give the project a name": "home.projectForm.nameRequired",
  "Say what the path teaches": "share.catalog.descriptionRequired",
  "Say who the path is for": "share.catalog.audienceRequired"
}

/** Turns a domain validation message into the current language; null and undefined pass through */
export type DomainMessage = <M extends string | null | undefined>(message: M) => M

export const translateDomainMessage = (t: Translate): DomainMessage => <M extends string | null | undefined>(message: M): M => {
  const key = message ? DOMAIN_MESSAGES[message] : undefined
  return (key ? t(key) : message) as M
}
