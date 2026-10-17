'use client';

import { Button, Tooltip } from '@mantine/core';
import { IconSquare, IconSquareCheckFilled } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';

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
  const t = useT();
  const effect = progress ? t('page.studied.effectWithProgress', progress) : t('page.studied.effect');
  return (
    <Tooltip
      label={t(studied ? 'page.studied.unmark' : 'page.studied.mark', { effect })}
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
        {t(studied ? 'page.studied.on' : 'page.studied.off')}
      </Button>
    </Tooltip>
  );
}
