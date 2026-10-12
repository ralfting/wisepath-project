'use client';

import { MantineProvider } from '@mantine/core';
import { RegistryProvider } from '@effect/atom-react';
import type { ReactNode } from 'react';
import { cssVariablesResolver, theme } from '@/theme';

/**
 * Client-side providers: Mantine (theme functions can't cross from the server
 * layout) and the atom registry the use cases run in.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="light">
      <RegistryProvider>{children}</RegistryProvider>
    </MantineProvider>
  );
}
