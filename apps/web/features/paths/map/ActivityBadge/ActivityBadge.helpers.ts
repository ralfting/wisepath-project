import { activitiesIn } from '@wisepath/domain/paths';
import type { Page, Path } from '@wisepath/domain/paths';
import type { Translate } from '@/i18n/I18nProvider';

/** What the map shows of a page's activities: some, with nothing ticked (a study, a visitor); some open; all done */
export type ActivityMark = { readonly kind: 'has' } | { readonly kind: 'open'; readonly count: number } | { readonly kind: 'done' };

/**
 * A page's activities as the map marks them; null with none. `progress`: the map shows its reader's progress (a
 * learning path, read by someone signed in); without it nothing is ticked, so nothing is open or done either.
 */
export function activityMarkOf(path: Pick<Path, 'id'>, page: Pick<Page, 'id' | 'content' | 'done'>, progress: boolean): ActivityMark | null {
  const all = activitiesIn(path.id, page);
  if (all.length === 0) return null;
  if (!progress) return { kind: 'has' };
  const done = page.done ?? [];
  const count = all.filter((activity) => !done.includes(activity.id)).length;
  return count > 0 ? { kind: 'open', count } : { kind: 'done' };
}

/** The mark in words, for a screen reader */
export function activityMarkLabel(t: Translate, mark: ActivityMark): string {
  if (mark.kind === 'open') return t('activity.badge.open', { count: mark.count });
  return t(mark.kind === 'done' ? 'activity.badge.done' : 'activity.badge.has');
}
