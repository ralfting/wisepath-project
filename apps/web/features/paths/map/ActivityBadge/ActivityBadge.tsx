'use client';

import { IconClipboardCheck, IconClipboardText } from '@tabler/icons-react';
import type { ActivityMark } from './ActivityBadge.helpers';
import classes from './ActivityBadge.module.css';

/**
 * A small clipboard after a page's title on the map and its lists: dimmed while it has activities to do or questions
 * to answer (or nothing tracked), teal with a check once all are done. Named for a screen reader where the row's own
 * text names the row; where the row has a label of its own, that label says it and this stays silent.
 */
export function ActivityBadge({ mark, label, size = 16 }: { mark: ActivityMark; label?: string; size?: number }) {
  const attributes = { className: classes.badge, ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }) };
  if (mark.kind === 'done') return <IconClipboardCheck size={size} stroke={1.8} color="var(--mantine-color-teal-light-color)" {...attributes} />;
  return <IconClipboardText size={size} stroke={1.8} color="var(--mantine-color-dimmed)" {...attributes} />;
}
