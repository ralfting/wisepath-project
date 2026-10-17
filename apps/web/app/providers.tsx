'use client';

import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { cssVariablesResolver, theme } from '@/theme';
import { UseCasesProvider } from '@/useCases/UseCasesProvider';
import { ToastHost } from '@/features/inbox/capture';
import { I18nProvider } from '@/i18n/I18nProvider';
import type { Locale } from '@/i18n/locales';
import { AccountLocale } from './AccountLocale';

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
