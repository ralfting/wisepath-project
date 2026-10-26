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

/** How long the ring stays on the activity the studied control pointed at */
const POINTED_MS = 1600;

/**
 * Takes the reader to the page's first open activity: scrolled into the middle of the screen, ringed for a moment,
 * and its Mark as done focused, so the keyboard lands where the work is. Run once the text is showing.
 */
export function showFirstOpenActivity() {
  const block = Array.from(document.querySelectorAll<HTMLElement>('.wp-editor [data-callout="activity"]:not([data-done])')).find(
    // Another tab's text is in the page too, hidden
    (element) => element.getClientRects().length > 0,
  );
  if (!block) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  block.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
  block.querySelector<HTMLElement>('button[role="switch"]')?.focus({ preventScroll: true });
  block.setAttribute('data-pointed', '');
  window.setTimeout(() => block.removeAttribute('data-pointed'), POINTED_MS);
}
