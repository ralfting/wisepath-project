'use client';

import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/domain/auth';
import { cssVariablesResolver, theme } from '@/theme';

/** Client-side providers: Mantine (theme functions can't cross from the server layout) and auth */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="light">
      <AuthProvider>{children}</AuthProvider>
    </MantineProvider>
  );
}
