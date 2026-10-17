import { MantineProvider } from '@mantine/core';
import { RegistryProvider } from '@effect/atom-react';
import { render } from '@testing-library/react';
import type { Layer } from 'effect';
import type { ReactElement } from 'react';
import { I18nProvider } from '@/i18n/I18nProvider';
import type { Locale } from '@/i18n/locales';
import { theme } from '@/theme';
import { testRuntime } from '@/useCases/testing';

/**
 * Renders a component as the app does (theme, language, use cases), with every
 * use case running on the given Layers. Each call gets a registry of its own.
 */
export function renderWithLayers<ROut, E>(ui: ReactElement, layers: Layer.Layer<ROut, E>, locale: Locale = 'en') {
  return render(
    <MantineProvider theme={theme}>
      <RegistryProvider initialValues={testRuntime(layers)}>
        <I18nProvider initialLocale={locale} initialChoice={null}>
          {ui}
        </I18nProvider>
      </RegistryProvider>
    </MantineProvider>
  );
}
