import { activitiesIn } from '@wisepath/domain/paths';
import type { ActivityId, Page, Path } from '@wisepath/domain/paths';

/** A page's activities as its reader ticks them: the domain's ids in text order, and their ticks */
export interface PageActivities {
  readonly ids: ReadonlyArray<ActivityId>;
  readonly done: ReadonlyArray<ActivityId>;
}

/** What the text reads of a page's activities. Only a learning path ticks them; a study has no progress, so null */
export function pageActivities(path: Path, page: Page): PageActivities | null {
  if (path.kind !== 'learningPath') return null;
  return { ids: activitiesIn(path.id, page).map((activity) => activity.id), done: page.done ?? [] };
}

/** How long the ring stays on the activity or question the studied control pointed at */
const POINTED_MS = 1600;

/** What the page still asks, as its blocks mark it: an activity not done, a question not answered */
const OPEN = '.wp-editor [data-callout="activity"]:not([data-done]), .wp-editor [data-callout="question"]:not([data-answered])';

/**
 * Takes the reader to the first thing the page still asks, in text order: scrolled into the middle of the screen,
 * ringed for a moment, and its Mark as done or its answer focused, so the keyboard lands where the work is. Run once
 * the text is showing.
 */
export function showFirstOpenTask() {
  const block = Array.from(document.querySelectorAll<HTMLElement>(OPEN)).find(
    // Another tab's text is in the page too, hidden
    (element) => element.getClientRects().length > 0,
  );
  if (!block) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  block.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
  block.querySelector<HTMLElement>('button[role="switch"], textarea')?.focus({ preventScroll: true });
  block.setAttribute('data-pointed', '');
  window.setTimeout(() => block.removeAttribute('data-pointed'), POINTED_MS);
}
