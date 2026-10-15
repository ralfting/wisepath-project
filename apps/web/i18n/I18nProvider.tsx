'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { translate } from './format';
import type { MessageKey, MessageTree, Values } from './format';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, matchLocale } from './locales';
import type { Locale } from './locales';
import { en } from './messages/en';
import type { Messages } from './messages/en';
import { ptBR } from './messages/pt-BR';
import { setUntitledLabel } from '@/features/shared/title';

/**
 * I18nProvider
 * The language the app speaks and its messages. It starts in the language the
 * server picked (so the first render matches), follows the account's choice
 * once the session is known, and changes everything at once when the learner
 * picks another.
 */

const MESSAGES: Record<Locale, MessageTree> = { en, 'pt-BR': ptBR };

export type TranslationKey = MessageKey<Messages>;
export type Translate = (key: TranslationKey, values?: Values) => string;

interface I18n {
  readonly locale: Locale;
  /** The language picked on the account, or null when it follows the browser */
  readonly choice: Locale | null;
  readonly t: Translate;
  /** Changes the language now; null goes back to the browser's */
  readonly setChoice: (choice: Locale | null) => void;
}

const I18nContext = createContext<I18n | null>(null);

/** The browser's own preference, on the client */
const browserLocale = (): Locale =>
  typeof navigator === 'undefined' ? DEFAULT_LOCALE : matchLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);

function writeCookie(choice: Locale | null) {
  // A year; cleared to follow the browser again
  document.cookie =
    choice === null ? `${LOCALE_COOKIE}=; path=/; max-age=0; samesite=lax` : `${LOCALE_COOKIE}=${choice}; path=/; max-age=31536000; samesite=lax`;
}

export function I18nProvider({ initialLocale, initialChoice, children }: { initialLocale: Locale; initialChoice: Locale | null; children: ReactNode }) {
  const [choice, setChoiceState] = useState<Locale | null>(initialChoice);
  const [locale, setLocale] = useState<Locale>(initialLocale);

  const setChoice = useCallback((next: Locale | null) => {
    writeCookie(next);
    setChoiceState(next);
    setLocale(next ?? browserLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback<Translate>((key, values) => translate(MESSAGES[locale], en, locale, key, values), [locale]);
  // Pages without a title are named in the language too; set before the tree below renders with it
  setUntitledLabel(t('common.untitledPage'));
  const value = useMemo(() => ({ locale, choice, t, setChoice }), [locale, choice, t, setChoice]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error('useT and useLocale need an I18nProvider above them');
  return i18n;
}

/** The function that turns a message key into text in the current language */
export const useT = (): Translate => useI18n().t;

/** The current language, the learner's choice, and how to change it */
export function useLocale() {
  const { locale, choice, setChoice } = useI18n();
  return { locale, choice, setChoice };
}

export { isLocale };
