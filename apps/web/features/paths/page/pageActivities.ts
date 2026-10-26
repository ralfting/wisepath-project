import { activitiesIn } from '@wisepath/domain/paths';
import type { ActivityId, Page, Path } from '@wisepath/domain/paths';

/** A page's activities as its reader works through them: the domain's ids in text order, their ticks, how many are open */
export interface PageActivities {
  readonly ids: ReadonlyArray<ActivityId>;
  readonly done: ReadonlyArray<ActivityId>;
  readonly open: number;
}

/**
 * What the text, the studied control and the drawer all read of a page's activities, so they can't disagree. Only
 * a learning path ticks them; a study has no progress, so null.
 */
export function pageActivities(path: Path, page: Page): PageActivities | null {
  if (path.kind !== 'learningPath') return null;
  const ids = activitiesIn(path.id, page).map((activity) => activity.id);
  const done = page.done ?? [];
  return { ids, done, open: ids.filter((id) => !done.includes(id)).length };
}
