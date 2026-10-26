'use client';

import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/** The room left and right of the full page, in rem, so it holds at any root font size */
export interface FrameRoom {
  readonly left: number;
  readonly right: number;
}

/**
 * The room beside the full page around the text, for what goes in its margins: the note bubbles on the left, the
 * outline on the right. Measured again when the window or the page changes width, and once the page has slid back
 * from beside a note's card. Null outside a full page: the drawer's box has no margin to use.
 */
export function useFrameRoom(inside: RefObject<HTMLElement | null>): FrameRoom | null {
  const [room, setRoom] = useState<FrameRoom | null>(null);

  useEffect(() => {
    const frame = inside.current?.closest<HTMLElement>('[data-note-frame="column"]');
    const area = frame?.parentElement;
    if (!frame || !area) return;
    const measure = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const page = frame.getBoundingClientRect();
      const around = area.getBoundingClientRect();
      const left = (page.left - around.left) / rem;
      const right = (document.documentElement.clientWidth - page.right) / rem;
      setRoom((current) => (current && current.left === left && current.right === right ? current : { left, right }));
    };
    // The page's own slide, not the transitions of everything inside it
    const slid = (event: TransitionEvent) => event.target === frame && event.propertyName === 'left' && measure();
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(area);
    frame.addEventListener('transitionend', slid);
    return () => {
      observer.disconnect();
      frame.removeEventListener('transitionend', slid);
    };
  }, [inside]);

  return room;
}
