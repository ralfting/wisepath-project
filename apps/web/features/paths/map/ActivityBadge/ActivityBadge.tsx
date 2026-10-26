'use client';

import { IconClipboardCheck, IconClipboardText } from '@tabler/icons-react';
import { activitiesIn, openActivities } from '@wisepath/domain/paths';
import type { Page, Path } from '@wisepath/domain/paths';
import type { Translate } from '@/i18n/I18nProvider';
import classes from './ActivityBadge.module.css';

/** What the map shows of a page's activities: some, in a study, where nothing is ticked; some open; all done */
export type ActivityMark = { readonly kind: 'has' } | { readonly kind: 'open'; readonly count: number } | { readonly kind: 'done' };

/** A page's activities as the map marks them; null with none */
export function activityMarkOf(path: Pick<Path, 'id' | 'kind'>, page: Pick<Page, 'id' | 'content' | 'done'>): ActivityMark | null {
  const all = activitiesIn(path.id, page);
  if (all.length === 0) return null;
  if (path.kind !== 'learningPath') return { kind: 'has' };
  const count = openActivities(path.id, page).length;
  return count > 0 ? { kind: 'open', count } : { kind: 'done' };
}

/** The mark in words, for a screen reader */
export function activityMarkLabel(t: Translate, mark: ActivityMark): string {
  if (mark.kind === 'open') return t('activity.badge.open', { count: mark.count });
  return t(mark.kind === 'done' ? 'activity.badge.done' : 'activity.badge.has');
}

/**
 * A small clipboard after a page's title on the map and its lists: dimmed while it has activities to do (or in a
 * study, nothing to tick), teal with a check once all are done. Named for a screen reader where the row's own text
 * names the row; where the row has a label of its own, that label says it and this stays silent.
 */
export function ActivityBadge({ mark, label, size = 16 }: { mark: ActivityMark; label?: string; size?: number }) {
  const attributes = { className: classes.badge, ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }) };
  if (mark.kind === 'done') return <IconClipboardCheck size={size} stroke={1.8} color="var(--mantine-color-teal-light-color)" {...attributes} />;
  return <IconClipboardText size={size} stroke={1.8} color="var(--mantine-color-dimmed)" {...attributes} />;
}
