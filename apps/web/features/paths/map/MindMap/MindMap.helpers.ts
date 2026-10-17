import type { CSSProperties } from 'react';
import type { MapTree, Page, PageColor } from '@wisepath/domain/paths';
import { shade } from '@/features/paths/path';
import type { MindLayout, PlacedNode, Point, RootShape } from '../mindLayout';

const tints = (color: PageColor) => ({
  '--c0': shade(color, 0),
  '--c1': shade(color, 1),
  '--c2': shade(color, 2),
  '--c3': shade(color, 3),
  '--c6': shade(color, 6),
});

/** Absolute position of a node: it grows away from the root, from its inner end */
export function place(n: PlacedNode, color: PageColor): CSSProperties {
  return {
    left: n.side === 1 ? n.inner.x : n.inner.x - n.w,
    top: n.inner.y - n.h / 2,
    width: n.w,
    height: n.h,
    '--lines': n.lines,
    ...tints(color),
  } as CSSProperties;
}

/** Absolute position of the root's card, centred on the map's origin */
export function placeBox(shape: RootShape, color: PageColor): CSSProperties {
  return { left: -shape.w / 2, top: -shape.h / 2, width: shape.w, height: shape.h, ...tints(color) } as CSSProperties;
}

/** Where the map stands in its viewport: its offset in pixels and its zoom */
export interface View {
  x: number;
  y: number;
  k: number;
}

export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 2.2;
/** The least zoom at which a page's 13px title still reads at 11px on screen: the map opens no smaller */
export const READABLE_ZOOM = 0.85;
/** How close adding a branch brings the page it grows from, at least */
export const FOCUS_ZOOM = 1.2;
/** Opening a page zooms out at most to this, to show the pages branching from it */
export const MIN_FRAME_ZOOM = 0.5;
/** The + button's size, in map units */
export const PLUS = 24;

export const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

/** The whole map in a viewport `w` × `h`; `floor` keeps text readable on the first view, at the cost of some panning */
export function fitView(bounds: MindLayout['bounds'], w: number, h: number, floor = 0): View {
  const { minX, minY, maxX, maxY } = bounds;
  const pad = 48;
  const whole = Math.min((w - pad) / (maxX - minX), (h - pad) / (maxY - minY), 1);
  // On a phone the whole map would be unreadable: start readable, around the root
  if (w < 640 && whole < READABLE_ZOOM) return { k: READABLE_ZOOM, x: w / 2, y: h / 2 };
  const k = clampZoom(Math.max(whole, Math.min(floor, 1)));
  return { k, x: w / 2 - k * ((minX + maxX) / 2), y: h / 2 - k * ((minY + maxY) / 2) };
}

/** Zooms by `factor` keeping the point `around` (in viewport pixels) where it is */
export function zoomAround(v: View, factor: number, around: Point): View {
  const k = clampZoom(v.k * factor);
  return { k, x: around.x - ((around.x - v.x) * k) / v.k, y: around.y - ((around.y - v.y) * k) / v.k };
}

/**
 * The view that shows a page with the pages branching from it, in the `visibleW` × `h` the drawer leaves; the view
 * unchanged when they are in sight already. Zooms out for the branch down to half size; past that, the page alone.
 */
export function frameView(v: View, page: Point, branch: ReadonlyArray<Point>, visibleW: number, h: number): View {
  const box = {
    minX: Math.min(...branch.map((p) => p.x)) - 90,
    maxX: Math.max(...branch.map((p) => p.x)) + 90,
    minY: Math.min(...branch.map((p) => p.y)) - 30,
    maxY: Math.max(...branch.map((p) => p.y)) + 30,
  };
  const margin = 40;
  const inView = (x: number, y: number) => x > margin && x < visibleW - margin && y > margin && y < h - margin;
  if (inView(v.x + box.minX * v.k, v.y + box.minY * v.k) && inView(v.x + box.maxX * v.k, v.y + box.maxY * v.k)) return v;
  const fitK = Math.min((visibleW - 2 * margin) / (box.maxX - box.minX), (h - 2 * margin) / (box.maxY - box.minY));
  const k = Math.min(v.k, Math.max(fitK, MIN_FRAME_ZOOM));
  const fits = fitK >= MIN_FRAME_ZOOM;
  const cx = fits ? (box.minX + box.maxX) / 2 : page.x;
  const cy = fits ? (box.minY + box.maxY) / 2 : page.y;
  return { k, x: visibleW / 2 - cx * k, y: h / 2 - cy * k };
}

/** Zoomed in on a page, a little above the middle of what the drawer leaves, so a field under it shows */
export function focusView(v: View, page: Point, visibleW: number, h: number): View {
  const k = clampZoom(Math.max(v.k, FOCUS_ZOOM));
  return { k, x: visibleW / 2 - page.x * k, y: h * 0.38 - page.y * k };
}

/**
 * The page an arrow key moves to on the map, as it is drawn: → and ← along the branches (outward to the nearest page
 * branching off, inward to the one it grows from), ↑ and ↓ to the page above or below on the same branch, Home to
 * the centre. Null when there is none that way.
 */
export function neighbourOf(layout: MindLayout, tree: MapTree, id: string, key: string): string | null {
  const rootId = tree.root.page.id;
  const placed = new Map(layout.nodes.map((n) => [n.page.id as string, n]));
  const nearest = (ids: ReadonlyArray<string>, y: number) =>
    ids.reduce<string | null>((best, candidate) => {
      if (best === null) return candidate;
      return Math.abs(placed.get(candidate)!.inner.y - y) < Math.abs(placed.get(best)!.inner.y - y) ? candidate : best;
    }, null);
  if (key === 'Home') return rootId;
  if (id === rootId) {
    if (key !== 'ArrowRight' && key !== 'ArrowLeft') return null;
    const side = key === 'ArrowRight' ? 1 : -1;
    return nearest(layout.nodes.filter((n) => n.depth === 1 && n.side === side).map((n) => n.page.id), 0);
  }
  const n = placed.get(id);
  const node = tree.nodes.get(id as Page['id']);
  if (!n || !node) return null;
  const outward = n.side === 1 ? 'ArrowRight' : 'ArrowLeft';
  const inward = n.side === 1 ? 'ArrowLeft' : 'ArrowRight';
  if (key === outward) return nearest(node.children.map((c) => c.page.id), n.inner.y);
  if (key === inward) return node.parentId;
  if (key !== 'ArrowUp' && key !== 'ArrowDown') return null;
  const column = layout.nodes
    .filter((m) => tree.nodes.get(m.page.id)?.parentId === node.parentId && m.side === n.side)
    .sort((a, b) => a.inner.y - b.inner.y);
  const at = column.findIndex((m) => m.page.id === id);
  return column[at + (key === 'ArrowDown' ? 1 : -1)]?.page.id ?? null;
}
