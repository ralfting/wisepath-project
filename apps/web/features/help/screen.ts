/** The screens Help has tips for */
export type Screen = 'page' | 'map' | 'inbox' | 'home';

/** Which screen the route is: a page (in the drawer or full), a path's map, the Inbox, or anything else (My paths) */
export function screenOf(pathname: string): Screen {
  if (/^\/paths\/[^/]+\/pages\/[^/]+/.test(pathname)) return 'page';
  if (/^\/paths\/[^/]+/.test(pathname)) return 'map';
  if (pathname === '/inbox') return 'inbox';
  return 'home';
}
