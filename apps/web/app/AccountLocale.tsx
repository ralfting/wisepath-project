'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/useCases/auth';
import { useLocale } from '@/i18n/I18nProvider';
import type { Locale } from '@/i18n/locales';

/**
 * The language chosen on the account wins when the account's value arrives or changes (logging in, a choice
 * made on another device); a choice made here is saved to the account, so they meet again
 */
export function AccountLocale() {
  const session = useSession();
  const { choice, setChoice } = useLocale();
  const saved = session.status === 'signedIn' ? (session.user.locale ?? null) : undefined;
  const seen = useRef<Locale | null | undefined>(undefined);
  useEffect(() => {
    if (saved === undefined || saved === seen.current) return;
    seen.current = saved;
    if (saved !== null && saved !== choice) setChoice(saved);
  }, [saved, choice, setChoice]);
  return null;
}
