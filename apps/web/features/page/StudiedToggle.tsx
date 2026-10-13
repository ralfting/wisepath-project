'use client';

import { Button, Tooltip } from '@mantine/core';
import { IconSquare, IconSquareCheckFilled } from '@tabler/icons-react';

/**
 * StudiedToggle
 * The page's studied flag, worded as the learner's own statement: an empty
 * box reading "I've studied this" becomes a ticked "Studied". The tooltip
 * says what it changes, so the map's progress never feels arbitrary.
 */
export function StudiedToggle({
  studied,
  onChange,
  progress,
}: {
  studied: boolean;
  onChange: (studied: boolean) => void;
  /** The map's name and count, for the tooltip */
  progress?: { map: string; studied: number; total: number };
}) {
  const effect = progress
    ? `Studied pages count toward ${progress.map}'s progress: ${progress.studied} of ${progress.total} so far.`
    : 'Studied pages count toward the path’s progress.';
  return (
    <Tooltip
      label={studied ? `${effect} Click to mark it as not studied yet.` : `Tick it once you've learned what this page covers. ${effect}`}
      multiline
      w={260}
      withArrow
    >
      <Button
        variant={studied ? 'light' : 'default'}
        color={studied ? 'teal' : 'gray'}
        size="xs"
        role="switch"
        aria-checked={studied}
        onClick={() => onChange(!studied)}
        leftSection={studied ? <IconSquareCheckFilled size={16} /> : <IconSquare size={16} stroke={1.8} />}
      >
        {studied ? 'Studied' : "I've studied this"}
      </Button>
    </Tooltip>
  );
}
