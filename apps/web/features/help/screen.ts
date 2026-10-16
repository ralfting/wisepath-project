/** The screens Help has tips for */
export type Screen = 'page' | 'map' | 'home';

/** Which screen the route is: a page (in the drawer or full), a path's map, or anything else */
export function screenOf(pathname: string): Screen {
  if (/^\/paths\/[^/]+\/pages\/[^/]+/.test(pathname)) return 'page';
  if (/^\/paths\/[^/]+/.test(pathname)) return 'map';
  return 'home';
}
