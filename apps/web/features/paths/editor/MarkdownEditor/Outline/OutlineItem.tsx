'use client';

import { UnstyledButton, VisuallyHidden } from '@mantine/core';
import { IconMessageCheck, IconMessageQuestion, IconPlayerPlay } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/I18nProvider';
import classes from './Outline.module.css';
import type { OutlineEntry } from './Outline.helpers';
import { VideoTitle } from './VideoTitle';

/** A question or a video is marked by its icon, and named by its kind for whoever can't see the icon */
const MARKS: Record<'question' | 'answered' | 'video', { icon: Icon; label: TranslationKey }> = {
  question: { icon: IconMessageQuestion, label: 'editor.outline.kinds.question' },
  answered: { icon: IconMessageCheck, label: 'editor.outline.kinds.answered' },
  video: { icon: IconPlayerPlay, label: 'editor.outline.kinds.video' },
};

interface OutlineItemProps {
  entry: OutlineEntry;
  depth: number;
  active: boolean;
  answered: boolean;
  /** Listed, the entries are one stop for Tab, at the one being read; ↑ ↓ move between them */
  tabbable: boolean;
  onGo: (entry: OutlineEntry) => void;
}

/** One entry of the outline, by name: a click goes to it */
export function OutlineItem({ entry, depth, active, answered, tabbable, onGo }: OutlineItemProps) {
  const t = useT();
  const mark = entry.kind === 'heading' ? null : MARKS[answered ? 'answered' : entry.kind];
  const text = entry.kind === 'video' ? <VideoTitle url={entry.url} /> : entry.text;

  return (
    <UnstyledButton
      data-outline-item
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onGo(entry)}
      className={classes.outlineItem}
      data-level={depth}
      data-kind={entry.kind}
      data-answered={answered || undefined}
      data-active={active || undefined}
      aria-current={active ? 'location' : undefined}
      tabIndex={tabbable ? 0 : -1}
      title={entry.kind === 'video' ? undefined : mark ? `${t(mark.label)}: ${entry.text}` : entry.text}
    >
      {mark && <mark.icon className={classes.outlineIcon} aria-hidden />}
      <span className={classes.outlineText}>
        {mark && <VisuallyHidden>{t(mark.label)}: </VisuallyHidden>}
        {text}
      </span>
    </UnstyledButton>
  );
}
