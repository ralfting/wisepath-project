'use client';

import { useEffect, useState } from 'react';
import { Text } from '@mantine/core';

/** ⌘P (Ctrl P) beside the search link, where there is a keyboard */
export function SearchShortcut() {
  const [keys, setKeys] = useState<string | null>(null);
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    setKeys(/Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘P' : 'Ctrl P');
  }, []);
  return keys ? (
    <Text size="xs" c="dimmed" aria-hidden>
      {keys}
    </Text>
  ) : null;
}
