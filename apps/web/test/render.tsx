import { MantineProvider } from '@mantine/core';
import { RegistryProvider } from '@effect/atom-react';
import { render } from '@testing-library/react';
import type { Layer } from 'effect';
import type { ReactElement, ReactNode } from 'react';
import { I18nProvider } from '@/i18n/I18nProvider';
import type { Locale } from '@/i18n/locales';
import { theme } from '@/theme';
import { testRuntime } from '@/useCases/testing';

/**
 * Renders a component as the app does (theme, language, use cases), with every
 * use case running on the given Layers. Each call gets a registry of its own;
 * rerender keeps it, so a test can reopen a component on the same data.
 */
export function renderWithLayers<ROut, E>(ui: ReactElement, layers: Layer.Layer<ROut, E>, locale: Locale = 'en') {
  const initialValues = testRuntime(layers);
  function Providers({ children }: { children: ReactNode }) {
    return (
      <MantineProvider theme={theme}>
        <RegistryProvider initialValues={initialValues}>
          <I18nProvider initialLocale={locale} initialChoice={null}>
            {children}
          </I18nProvider>
        </RegistryProvider>
      </MantineProvider>
    );
  }
  return render(ui, { wrapper: Providers });
}
