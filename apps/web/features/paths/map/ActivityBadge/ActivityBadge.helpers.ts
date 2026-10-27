import { openTasks, tasksIn } from '@wisepath/domain/paths';
import type { Page, Path } from '@wisepath/domain/paths';
import type { Translate } from '@/i18n/I18nProvider';

/**
 * What the map shows of what a page asks, its activities and questions: some, with nothing tracked (a study, a
 * visitor); some open; all done
 */
export type ActivityMark = { readonly kind: 'has' } | { readonly kind: 'open'; readonly count: number } | { readonly kind: 'done' };

/**
 * What a page asks, as the map marks it; null when it asks nothing. `progress`: the map shows its reader's progress
 * (a learning path, read by someone signed in); without it nothing is tracked, so nothing is open or done either.
 */
export function activityMarkOf(
  path: Pick<Path, 'id'>,
  page: Pick<Page, 'id' | 'content' | 'done' | 'answers'>,
  progress: boolean,
): ActivityMark | null {
  if (tasksIn(path.id, page).length === 0) return null;
  if (!progress) return { kind: 'has' };
  const count = openTasks(path, page).length;
  return count > 0 ? { kind: 'open', count } : { kind: 'done' };
}

/** The mark in words, for a screen reader */
export function activityMarkLabel(t: Translate, mark: ActivityMark): string {
  if (mark.kind === 'open') return t('activity.badge.open', { count: mark.count });
  return t(mark.kind === 'done' ? 'activity.badge.done' : 'activity.badge.has');
}
