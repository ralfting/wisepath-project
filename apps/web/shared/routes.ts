/**
 * Routes
 * Where a map and its pages live. A page URL opens the page in a drawer over
 * the map when reached from inside the app, and as a full page when loaded
 * directly. ?open= on the map URL is how a link from outside the map (the
 * paths page, the full page) lands on the map with a page's drawer open.
 */

export const mapHref = (pathId: string) => `/paths/${pathId}`;

export const pageHref = (pathId: string, pageId: string) => `/paths/${pathId}/pages/${pageId}`;

/**
 * A page of any path, opened on its map. Use it to reach another path's page from inside the app: a client
 * navigation straight to pageHref of another path is intercepted as a drawer over the map still showing,
 * whose path differs, and lands on "Path not found". (A full load of pageHref is fine: it is the full page.)
 */
export const mapWithPageHref = (pathId: string, pageId: string) => `/paths/${pathId}?open=${encodeURIComponent(pageId)}`;

/** The page open in the drawer, read from the URL; null on the map alone */
/**
 * Shows another page in the open drawer at once: the URL changes in place, and
 * the map and the drawer read the page from it, so nothing waits for the
 * router. The route itself (and a reload) is the same as a navigation's.
 */
export function swapOpenPage(href: string): void {
  window.history.replaceState(null, '', href);
}

/**
 * Shows another full page in place: a navigation within the app would be caught by the drawer's route and open the
 * page over the map instead. A new history entry, so Back returns to the page before
 */
export function showFullPage(href: string): void {
  window.history.pushState(null, '', href);
  window.scrollTo(0, 0);
}

export function openPageId(pathname: string, pathId: string): string | null {
  const prefix = `${pageHref(pathId, '')}`;
  return pathname.startsWith(prefix) ? decodeURIComponent(pathname.slice(prefix.length).split('/')[0]) || null : null;
}

/** Where the app sends a learner once logged in, unless they were on their way somewhere */
/** A public map, read without an account (the Share dialog's link) */
export const publicMapHref = (pathId: string) => `/public/paths/${pathId}`;

/** The catalog: every published map, or those the words searched, a language and a page of results narrow it to */
export const exploreHref = (filter: { readonly q?: string | null; readonly lang?: string | null; readonly page?: number } = {}) => {
  const params = new URLSearchParams();
  if (filter.q) params.set('q', filter.q);
  if (filter.lang) params.set('lang', filter.lang);
  if (filter.page && filter.page > 1) params.set('page', String(filter.page));
  const query = params.toString();
  return query ? `/explore?${query}` : '/explore';
};

/** A published map in the catalog, at its root page or at one of its pages */
export const catalogHref = (pathSlug: string, pageSlug?: string) => (pageSlug ? `/p/${pathSlug}/${pageSlug}` : `/p/${pathSlug}`);

export const HOME = '/paths';

/** Where WisePath's administrators review requests to publish paths to the catalog */
export const ADMIN_PUBLICATIONS = '/admin/publications';

/** The login page, coming back to an address of the app's own once logged in */
export const loginHref = (next: string) => `/login?next=${encodeURIComponent(next)}`;

/** The signup page, coming back the same way once the account exists */
export const signupHref = (next: string) => `/signup?next=${encodeURIComponent(next)}`;

/** Marks an address a visitor left to sign up or log in in order to study the path read there */
export const STUDY_INTENT = 'study';

/** A path's reading address that, once the visitor is back with an account, takes the path for them */
export const withStudyIntent = (href: string) => `${href}${href.includes('?') ? '&' : '?'}${STUDY_INTENT}`;

/** Where to go after logging in: the address asked for, only when it is one of the app's own (not //other.site) */
export const afterLogin = (next: string | null | undefined) => (next && /^\/(?![/\\])/.test(next) ? next : HOME);
