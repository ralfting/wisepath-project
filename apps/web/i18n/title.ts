import type { Page } from '@wisepath/domain/paths';
import { freeTitle } from '@wisepath/domain/paths';

/**
 * A page's title as shown, with the app's word for a page that has none yet
 * ("Untitled page", "Página sem título"). The domain's displayTitle says it in
 * English; this one in the current language, which the I18nProvider sets.
 */

let untitled = 'Untitled page';

export function setUntitledLabel(label: string): void {
  untitled = label;
}

export function displayTitle(page: Pick<Page, 'title'>): string {
  return page.title.trim() || untitled;
}

/** The name a page made before it had one gets: "Untitled page", or "Untitled page (2)" when that is taken */
export function untitledName(pages: ReadonlyArray<Pick<Page, 'title'>>): string {
  return freeTitle(pages, untitled);
}

/** Whether a title is still that stand-in, to be replaced by the page's real name */
export function isUntitled(title: string): boolean {
  return title === untitled || (title.startsWith(`${untitled} (`) && /^ \(\d+\)$/.test(title.slice(untitled.length)));
}

/** A page made without a name, with nothing written in it yet: it opens on its title, to be given one */
export function awaitsName(page: Pick<Page, 'title' | 'content'>): boolean {
  return isUntitled(page.title) && !page.content.trim();
}
