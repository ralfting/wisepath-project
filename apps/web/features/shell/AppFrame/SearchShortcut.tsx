'use client';

import { useEffect, useState } from 'react';
import { Text } from '@mantine/core';
import { isMacPlatform } from '@/ui/platform';

/** ⌘P (Ctrl P) beside the search link, where there is a keyboard */
export function SearchShortcut() {
  const [keys, setKeys] = useState<string | null>(null);
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    setKeys(isMacPlatform() ? '⌘P' : 'Ctrl P');
  }, []);
  return keys ? (
    <Text size="xs" c="dimmed" aria-hidden>
      {keys}
    </Text>
  ) : null;
}
