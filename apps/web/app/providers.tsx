'use client';

import { MantineProvider } from '@mantine/core';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { cssVariablesResolver, theme } from '@/theme';
import { UseCasesProvider } from '@/useCases/UseCasesProvider';
import { useSession } from '@/useCases/auth';
import { ToastHost } from '@/features/inbox/capture';
import { I18nProvider, useLocale } from '@/i18n/I18nProvider';
import type { Locale } from '@/i18n/locales';

/**
 * Client-side providers: Mantine (theme functions can't cross from the server
 * layout) and its toasts, the registry the use cases run in, and the app's language (picked
 * on the server, then kept in step with the account's choice).
 */
export function Providers({ locale, choice, children }: { locale: Locale; choice: Locale | null; children: ReactNode }) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="light">
      <ToastHost />
      <UseCasesProvider>
        <I18nProvider initialLocale={locale} initialChoice={choice}>
          <AccountLocale />
          {children}
        </I18nProvider>
      </UseCasesProvider>
    </MantineProvider>
  );
}

/**
 * The language chosen on the account wins when the account's value arrives or changes (logging in, a choice
 * made on another device); a choice made here is saved to the account, so they meet again
 */
function AccountLocale() {
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
