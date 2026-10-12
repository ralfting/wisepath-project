'use client';

import { RingProgress, Text, Tooltip, UnstyledButton, VisuallyHidden } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import type { Page } from '@wisepath/domain/projects';
import { displayTitle } from '@wisepath/domain/projects';
import classes from './ContinueButton.module.css';

/**
 * ContinueButton
 * Where the learner stands and where they go next, in one control: a ring
 * with how much of the map is studied, then "Continue studying" and the name
 * of the page it opens. Once every page is studied it says so and rests.
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
  /** Ring and arrow only, for a phone */
  compact?: boolean;
}) {
  const percent = total ? Math.round((studied / total) * 100) : 0;
  const done = total > 0 && !next;
  const title = done ? 'All pages studied' : total ? 'Continue studying' : 'No pages yet';
  const detail = next ? `Next: ${displayTitle(next)}` : done ? 'Every page on the map' : 'Link pages from the centre';
  const summary = `${studied} of ${total} pages studied`;

  return (
    <Tooltip label={next ? `${summary}. Opens ${displayTitle(next)}.` : summary} withArrow>
      <UnstyledButton
        className={classes.button}
        data-done={done || undefined}
        data-compact={compact || undefined}
        disabled={!next}
        onClick={onContinue}
        aria-label={next ? `Continue studying: ${displayTitle(next)}. ${summary}.` : `${title}. ${summary}.`}
      >
        <RingProgress
          size={compact ? 30 : 36}
          thickness={compact ? 3 : 3.5}
          roundCaps
          rootColor="rgba(255, 255, 255, 0.28)"
          sections={[{ value: percent, color: done ? 'white' : 'teal.2' }]}
          label={
            compact ? null : (
              <Text ta="center" fz={10} fw={800} c="white" lh={1}>
                {percent}%
              </Text>
            )
          }
          aria-hidden
        />
        {!compact && (
          <span className={classes.text}>
            <span className={classes.title}>{title}</span>
            <span className={classes.detail}>{detail}</span>
          </span>
        )}
        {next && <IconChevronRight size={16} className={classes.arrow} aria-hidden="true" />}
        <VisuallyHidden>{summary}</VisuallyHidden>
      </UnstyledButton>
    </Tooltip>
  );
}
