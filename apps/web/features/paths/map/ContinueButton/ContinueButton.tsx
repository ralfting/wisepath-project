'use client';

import { Button, Group, RingProgress, Text, Tooltip } from '@mantine/core';
import { IconArrowRight, IconCircleCheckFilled } from '@tabler/icons-react';
import type { Page } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';
import { useT } from '@/i18n/I18nProvider';
import classes from './ContinueButton.module.css';

/**
 * ContinueButton
 * Where the learner stands and the way on, side by side: a small ring with
 * how many pages are studied, then a plain button that opens the next one
 * (named in its tooltip). Once every page is studied the ring closes into a
 * check and the button goes: nothing is left to continue.
 */
export function ContinueButton({
  next,
  studied,
  total,
  onContinue,
  compact = false,
}: {
  next: Page | undefined;
  studied: number;
  total: number;
  onContinue: () => void;
  /** The ring without its count, for a phone: the path's title needs the room */
  compact?: boolean;
}) {
  const t = useT();
  const percent = total ? Math.round((studied / total) * 100) : 0;
  const done = total > 0 && !next;
  const summary = t('map.continue.summary', { studied, count: total });
  // Worded as on the home's cards; a phone has room for the verb only
  const starting = studied === 0;
  const label = compact
    ? t(starting ? 'map.continue.start' : 'map.continue.continue')
    : t(starting ? 'map.continue.startStudying' : 'map.continue.continueStudying');
  // A path with no pages yet has nothing to count or continue
  if (total === 0) return null;

  return (
    <Group gap={compact ? 8 : 12} wrap="nowrap" className={classes.root}>
      <Tooltip label={done ? t('map.continue.allStudied', { count: total }) : summary} withArrow>
        <span className={classes.progress} data-done={done || undefined} aria-label={summary} role="img">
          {done ? (
            <IconCircleCheckFilled size={18} color="var(--mantine-color-teal-6)" aria-hidden />
          ) : (
            <RingProgress size={22} thickness={3} roundCaps sections={[{ value: percent, color: 'teal.6' }]} aria-hidden />
          )}
          {!compact && (
            <Text component="span" size="sm" fw={600} className={classes.count} aria-hidden>
              {t('map.continue.count', { studied, count: total })}
            </Text>
          )}
        </span>
      </Tooltip>
      {next && (
        <Tooltip label={t('map.continue.opens', { title: displayTitle(next) })} withArrow>
          <Button
            size={compact ? 'xs' : 'sm'}
            radius="md"
            rightSection={<IconArrowRight size={16} />}
            onClick={onContinue}
            aria-label={t(starting ? 'map.continue.startStudyingPage' : 'map.continue.continueStudyingPage', { title: displayTitle(next) })}
          >
            {label}
          </Button>
        </Tooltip>
      )}
    </Group>
  );
}
