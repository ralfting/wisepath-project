'use client';

import { Button } from '@mantine/core';

/**
 * StudiedToggle
 * A quiet switch for the page's studied flag, drawn as the chart's star symbol.
 */
export function StudiedToggle({ studied, onChange }: { studied: boolean; onChange: (studied: boolean) => void }) {
  return (
    <Button
      variant="subtle"
      color="gray"
      c="var(--mantine-color-text)"
      size="compact-sm"
      role="switch"
      aria-checked={studied}
      onClick={() => onChange(!studied)}
      leftSection={
        <svg width="14" height="14" aria-hidden="true">
          {studied ? (
            <circle cx="7" cy="7" r="6" fill="var(--mantine-color-atlas-7)" />
          ) : (
            <circle cx="7" cy="7" r="5" fill="none" stroke="var(--mantine-color-atlas-7)" strokeWidth="1.6" />
          )}
        </svg>
      }
    >
      Studied
    </Button>
  );
}
