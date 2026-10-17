'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { nearestCorner, saveCorner, savedCorner } from './VideoBlock.helpers';
import type { Corner } from './VideoBlock.helpers';

/**
 * Out of view while playing (or paused for a note), the video floats small in a corner of the area the text is in,
 * until it is back in view or closed; dragged, it settles in the nearest corner, remembered for this viewer
 */
export function useFloatingVideo({
  slot,
  stage,
  playing,
  writingNote,
  inView,
  dismissed,
  fullscreen,
}: {
  slot: RefObject<HTMLDivElement | null>;
  stage: RefObject<HTMLDivElement | null>;
  playing: boolean;
  /** Paused for a note it stays afloat, so the popup shows where the video is */
  writingNote: boolean;
  inView: boolean;
  dismissed: boolean;
  fullscreen: boolean;
}) {
  const [corner, setCorner] = useState<Corner>('br');
  useEffect(() => setCorner(savedCorner()), []);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const floating = (playing || writingNote) && !inView && !dismissed && !fullscreen;

  // The corners are those of the area the text is in (the page beside the sidebar, or the drawer), not the
  // window's. The drawer moves what is fixed inside it to its own box, so that offset comes off
  const [place, setPlace] = useState<CSSProperties>({});
  useEffect(() => {
    if (!floating) return;
    const measure = () => {
      const el = stage.current;
      const at = slot.current;
      const area = at?.closest('.mantine-Drawer-content, .mantine-AppShell-main')?.getBoundingClientRect();
      if (!el || !at || !area) return;
      const bottomOf = (selector: string, within: ParentNode = document) => within.querySelector(selector)?.getBoundingClientRect().bottom ?? 0;
      // What of the area is on screen: past the sidebar, below the top bar and the editor's toolbar that stays up
      const visible = {
        left: Math.max(area.left, document.querySelector('.mantine-AppShell-navbar')?.getBoundingClientRect().right ?? 0, 0),
        right: Math.min(area.right, window.innerWidth),
        top: Math.max(area.top, 0, bottomOf('.mantine-AppShell-header'), bottomOf('.mantine-RichTextEditor-toolbar', at.closest('.mantine-RichTextEditor-root') ?? document)),
        bottom: Math.min(area.bottom, window.innerHeight),
      };
      // Fixed inside the drawer means fixed to the drawer's box, not the window's
      const box = el.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
      const gap = 16;
      setPlace({
        ...(corner[0] === 't' ? { top: visible.top + gap - box.top } : { bottom: box.bottom - visible.bottom + gap }),
        ...(corner[1] === 'l' ? { left: visible.left + gap - box.left } : { right: box.right - visible.right + gap }),
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [floating, corner, slot, stage]);

  // The floating video moves with the pointer, then settles in the nearest corner
  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    const start = { x: event.clientX, y: event.clientY };
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => setDrag({ x: e.clientX - start.x, y: e.clientY - start.y });
    const end = (e: PointerEvent) => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      const box = stage.current?.getBoundingClientRect();
      setDrag(null);
      if (!box || (Math.abs(e.clientX - start.x) < 4 && Math.abs(e.clientY - start.y) < 4)) return;
      const next = nearestCorner(box, window.innerWidth, window.innerHeight);
      setCorner(next);
      saveCorner(next);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };

  return {
    floating,
    corner,
    drag,
    style: floating ? ({ ...place, ...(drag ? { '--drag-x': `${drag.x}px`, '--drag-y': `${drag.y}px` } : {}) } as CSSProperties) : undefined,
    startDrag,
  };
}
