"use client"

import { useMemo } from "react"
import { useT } from "@/i18n/I18nProvider"
import { translateDomainMessage } from "./domainMessages"
import type { DomainMessage } from "./domainMessages"

/** The domain's validation messages in the current language (see domainMessages.ts) */
export function useDomainMessage(): DomainMessage {
  const t = useT()
  return useMemo(() => translateDomainMessage(t), [t])
}
