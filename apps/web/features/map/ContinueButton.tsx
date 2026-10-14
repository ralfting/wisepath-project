'use client';

import { Button, Group, RingProgress, Text, Tooltip } from '@mantine/core';
import { IconArrowRight, IconCircleCheckFilled } from '@tabler/icons-react';
import type { Page } from '@wisepath/domain/projects';
import { displayTitle } from '@wisepath/domain/projects';
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
  /** The count without "pages", for a phone */
  compact?: boolean;
}) {
  const percent = total ? Math.round((studied / total) * 100) : 0;
  const done = total > 0 && !next;
  const summary = `${studied} of ${total} pages studied`;
  const count = compact ? `${studied}/${total}` : `${studied}/${total} pages`;
  // Worded as on the home's cards; a phone has room for the verb only
  const action = studied === 0 ? 'Start' : 'Continue';
  const label = compact ? action : `${action} studying`;
  // A path with no pages yet has nothing to count or continue
  if (total === 0) return null;

  return (
    <Group gap={compact ? 8 : 12} wrap="nowrap" className={classes.root}>
      <Tooltip label={done ? `All ${total} pages studied` : summary} withArrow>
        <span className={classes.progress} data-done={done || undefined} aria-label={summary} role="img">
          {done ? (
            <IconCircleCheckFilled size={18} color="var(--mantine-color-teal-6)" aria-hidden />
          ) : (
            <RingProgress size={22} thickness={3} roundCaps sections={[{ value: percent, color: 'teal.6' }]} aria-hidden />
          )}
          <Text component="span" size="sm" fw={600} className={classes.count} aria-hidden>
            {count}
          </Text>
        </span>
      </Tooltip>
      {next && (
        <Tooltip label={`Opens ${displayTitle(next)}`} withArrow>
          <Button
            size={compact ? 'xs' : 'sm'}
            radius="md"
            rightSection={<IconArrowRight size={16} />}
            onClick={onContinue}
            aria-label={`${action} studying: ${displayTitle(next)}`}
          >
            {label}
          </Button>
        </Tooltip>
      )}
    </Group>
  );
}
