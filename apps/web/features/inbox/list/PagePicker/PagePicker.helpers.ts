import type { Page, Path, PathSummary } from '@wisepath/domain/paths';
import { canEdit } from '@wisepath/domain/paths';
import type { PageTarget } from '@/useCases/inbox';
import { displayTitle } from '@/i18n/title';

/** The page the picker answers with, and its title as shown */
export interface PickedPage extends PageTarget {
  readonly pageTitle: string;
}

/** Whether a title has what is typed in it, ignoring case and the spaces around it */
export const matches = (title: string, query: string) => title.toLowerCase().includes(query.trim().toLowerCase());

// → and ← move between the steps only where they can't move the cursor in the search any further
export const caretAt = (field: HTMLInputElement, end: 'start' | 'end') =>
  field.selectionStart === field.selectionEnd && field.selectionStart === (end === 'start' ? 0 : field.value.length);

/**
 * The picker's paths: those the learner may edit (a path from others they only read takes nothing), the one last
 * opened on this device first, then as listed, those whose title matches
 */
export function pathsFor(paths: ReadonlyArray<PathSummary>, last: string | null, query: string): ReadonlyArray<PathSummary> {
  return [...paths]
    .sort((a, b) => Number(b.id === last) - Number(a.id === last))
    .filter((p) => canEdit(p.access) && matches(p.title, query));
}

/** The picker's pages of a path: its main page first, then the rest as they were added, those whose title matches */
export function pagesFor(path: Path, query: string): ReadonlyArray<Page> {
  const ordered = [...path.pages].sort((a, b) => Number(b.id === path.rootPageId) - Number(a.id === path.rootPageId));
  return ordered.filter((p) => matches(displayTitle(p), query));
}
