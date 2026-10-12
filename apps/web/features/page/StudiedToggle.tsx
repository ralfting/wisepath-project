'use client';

import { Button } from '@mantine/core';
import { IconCheck, IconCircle } from '@tabler/icons-react';

/**
 * StudiedToggle
 * The topic's studied flag as a button: outlined until studied, then teal.
 */
export function StudiedToggle({ studied, onChange }: { studied: boolean; onChange: (studied: boolean) => void }) {
  return (
    <Button
      variant={studied ? 'light' : 'default'}
      color={studied ? 'teal' : 'gray'}
      size="xs"
      role="switch"
      aria-checked={studied}
      onClick={() => onChange(!studied)}
      leftSection={studied ? <IconCheck size={15} stroke={2.4} /> : <IconCircle size={15} />}
    >
      {studied ? 'Studied' : 'Mark as studied'}
    </Button>
  );
}
