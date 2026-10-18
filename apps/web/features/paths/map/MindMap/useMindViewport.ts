'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { MapTree, Page } from '@wisepath/domain/paths';
import type { MindLayout, Point } from '../mindLayout';
import { isGhost } from '../ghosts';
import { READABLE_ZOOM, fitView, focusView, frameView, zoomAround } from './MindMap.helpers';
import type { View } from './MindMap.helpers';
import type { FocusRequest } from './MindMap';

/**
 * The mind map's viewport: its size, the view (pan and zoom), dragging and the wheel (Ctrl/⌘ + wheel or a pinch
 * zooms), and the moves it makes on its own (gliding there): fitting the map, bringing a page and its branches into
 * view beside the drawer, zooming in on the page a branch is added to
 */
export function useMindViewport({
  tree,
  layout,
  coveredRight,
  focusRequest,
  branchFrom,
}: {
  tree: MapTree;
  layout: MindLayout;
  coveredRight: number;
  focusRequest: FocusRequest | null;
  branchFrom: string | null;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<View | null>(null);
  // A move the view makes on its own glides there: quickly, or slowly when it zooms in to focus a page
  const [animate, setAnimate] = useState<false | 'quick' | 'slow'>(false);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const fit = useCallback((w: number, h: number, floor = 0) => fitView(layout.bounds, w, h, floor), [layout.bounds]);

  // Track the viewport size; fit the map the first time it is known. Measure
  // once right away too: a tab that is not painting yet delays the observer.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const measure = (w: number, h: number) => {
      if (!w || !h) return;
      setSize({ w, h });
      setView((v) => v ?? fit(w, h, READABLE_ZOOM));
    };
    const rect = el.getBoundingClientRect();
    measure(rect.width, rect.height);
    const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width, entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  const smoothly = (next: (v: View) => View, speed: 'quick' | 'slow' = 'quick') => {
    setAnimate(speed);
    setView((v) => (v ? next(v) : v));
  };
  const zoomBy = (factor: number, around?: Point) =>
    setView((v) => (v && size ? zoomAround(v, factor, around ?? { x: size.w / 2, y: size.h / 2 }) : v));
  // The part of the viewport the drawer leaves visible
  const visibleWidth = (w: number) => {
    const frameRight = viewport.current?.getBoundingClientRect().right ?? 0;
    return w - Math.max(0, Math.min(coveredRight - (window.innerWidth - frameRight), w - 200));
  };

  // Bring a page into view, with its branches: asked from outside the map (search, related pages), or moved to by keyboard
  const frameOn = (pageId: string) => {
    if (!size) return;
    const c = layout.centres.get(pageId as Page['id']);
    if (!c) return;
    // The page and the pages branching from it, so opening a page shows where it leads
    const branch = [
      c,
      ...(tree.nodes.get(pageId as Page['id'])?.children ?? []).map((child) => layout.centres.get(child.page.id)).filter((p): p is Point => !!p),
    ];
    smoothly((v) => frameView(v, c, branch, visibleWidth(size.w), size.h));
  };
  // Adding a branch zooms in on the page it grows from, a little above the middle so its name field shows below
  const focusOn = (pageId: string) => {
    if (!size) return;
    const c = pageId === tree.root.page.id ? { x: 0, y: 0 } : layout.centres.get(pageId as Page['id']);
    if (!c) return;
    smoothly((v) => focusView(v, c, visibleWidth(size.w), size.h), 'slow');
  };
  useEffect(() => {
    if (branchFrom) focusOn(branchFrom);
    // Only when the field opens on another page, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFrom]);
  // A page just named with [[ ]] is brought into view with the page naming it: it often grows under the drawer
  const ghosts = useRef<ReadonlySet<string> | null>(null);
  useEffect(() => {
    const now = new Set([...tree.nodes.keys()].filter(isGhost));
    const before = ghosts.current;
    ghosts.current = now;
    // Not on the first drawing: a map opening with ghosts stays as it opened
    const added = before ? [...now].find((id) => !before.has(id)) : undefined;
    const parentId = added && tree.nodes.get(added as Page['id'])?.parentId;
    if (parentId) frameOn(parentId);
    // Only when the ghosts change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree]);
  useEffect(() => {
    if (focusRequest) frameOn(focusRequest.pageId);
    // Runs again once the size is known, so a page opened from the URL is brought into view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce, size !== null]);

  // Wheel pans; Ctrl/⌘ + wheel (and trackpad pinch) zooms around the pointer
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setAnimate(false);
      if (event.ctrlKey || event.metaKey) {
        const rect = el.getBoundingClientRect();
        zoomBy(Math.exp(-event.deltaY * 0.01), { x: event.clientX - rect.left, y: event.clientY - rect.top });
      } else {
        setView((v) => (v ? { ...v, x: v.x - event.deltaX, y: v.y - event.deltaY } : v));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setAnimate(false);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    d.x = event.clientX;
    d.y = event.clientY;
    d.moved = true;
    setView((v) => (v ? { ...v, x: v.x + dx, y: v.y + dy } : v));
  };

  return {
    viewport,
    state: { view, animate, dragging: drag.current !== null },
    operations: {
      zoomIn: () => zoomBy(1.2),
      zoomOut: () => zoomBy(1 / 1.2),
      fitAll: () => size && smoothly(() => fit(size.w, size.h)),
      /** Keeps the zoom and brings the root to the middle */
      centreOnRoot: () => size && smoothly((v) => ({ ...v, x: size.w / 2, y: size.h / 2 })),
      frameOn,
      pointerDown,
      pointerMove,
      pointerUp: () => {
        drag.current = null;
      },
      settled: () => setAnimate(false),
    },
  };
}
