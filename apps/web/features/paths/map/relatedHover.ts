/**
 * Related hover
 * A page pointed at in the drawer's Related list, told to the map beside it so
 * it can single out the connection: the drawer and the map are separate routes,
 * so it travels as a window event. null when the pointer (or focus) leaves.
 */

export const RELATED_HOVER_EVENT = 'wisepath:related-hover';

export function pointAtRelated(pageId: string | null): void {
  window.dispatchEvent(new CustomEvent<string | null>(RELATED_HOVER_EVENT, { detail: pageId }));
}

export function relatedFromEvent(event: Event): string | null {
  return (event as CustomEvent<string | null>).detail ?? null;
}
