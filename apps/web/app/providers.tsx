'use client';

import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { cssVariablesResolver, theme } from '@/theme';
import { UseCasesProvider } from '@/useCases/UseCasesProvider';

/**
 * Client-side providers: Mantine (theme functions can't cross from the server
 * layout) and the registry the use cases run in.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="light">
      <UseCasesProvider>{children}</UseCasesProvider>
    </MantineProvider>
  );
}
