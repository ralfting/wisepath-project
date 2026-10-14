/**
 * Routes
 * Where a map and its pages live. A page URL opens the page in a drawer over
 * the map when reached from inside the app, and as a full page when loaded
 * directly. ?open= on the map URL is how a link from outside the map (the
 * projects page, the full page) lands on the map with a page's drawer open.
 */

export const mapHref = (projectId: string) => `/projects/${projectId}`;

export const pageHref = (projectId: string, pageId: string) => `/projects/${projectId}/pages/${pageId}`;

export const mapWithPageHref = (projectId: string, pageId: string) => `/projects/${projectId}?open=${encodeURIComponent(pageId)}`;

/** The page open in the drawer, read from the URL; null on the map alone */
/**
 * Shows another page in the open drawer at once: the URL changes in place, and
 * the map and the drawer read the page from it, so nothing waits for the
 * router. The route itself (and a reload) is the same as a navigation's.
 */
export function swapOpenPage(href: string): void {
  window.history.replaceState(null, '', href);
}

export function openPageId(pathname: string, projectId: string): string | null {
  const prefix = `${pageHref(projectId, '')}`;
  return pathname.startsWith(prefix) ? decodeURIComponent(pathname.slice(prefix.length).split('/')[0]) || null : null;
}
