import type { Page } from '@wisepath/domain/paths';

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
