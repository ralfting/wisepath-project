'use client';

import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { NoteRect } from '@/features/paths/editor';
import { placeNoteCard } from './PageNotes.helpers';
import type { CardPlace } from './PageNotes.helpers';

/**
 * Where a note's card sits beside the page, measured again as the page scrolls, the window resizes or the card grows.
 * The page is the nearest `data-note-frame` around the text: `column` for the full page, which moves left when the
 * card needs the room (through `--note-shift`), `window` for the drawer, beside which the card goes over the map.
 */
export function useNoteCardPlace(noteId: string, at: NoteRect, box: RefObject<HTMLElement | null>) {
  // State, not a ref: the card mounts a step after this hook's first render, once its portal is there
  const [card, setCard] = useState<HTMLDivElement | null>(null);
  const [place, setPlace] = useState<CardPlace | null>(null);

  useLayoutEffect(() => {
    const text = box.current;
    if (!text || !card) return;
    const frame = text.closest<HTMLElement>('[data-note-frame]') ?? text;
    const movable = frame.dataset.noteFrame === 'column';
    const gap = parseFloat(getComputedStyle(document.documentElement).fontSize);

    const measure = () => {
      const passage = [...text.querySelectorAll('[data-page-note]')].find((el) => el.getAttribute('data-page-note') === noteId);
      const rect = frame.getBoundingClientRect();
      // Where the page sits before its shift, which may still be sliding
      const shifted = movable ? parseFloat(getComputedStyle(frame).left) || 0 : 0;
      const next = placeNoteCard({
        passage: passage?.getBoundingClientRect() ?? at,
        frame: { left: rect.left - shifted, right: rect.right - shifted },
        area: movable && frame.parentElement ? contentOf(frame.parentElement) : { left: 0, right: window.innerWidth },
        movable,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        card: { width: card.offsetWidth, height: card.offsetHeight },
        gap,
      });
      if (movable) frame.style.setProperty('--note-shift', `${next.shift}px`);
      setPlace((last) => (last && last.side === next.side && last.top === next.top && last.left === next.left ? last : next));
    };

    measure();
    // A new note's passage is drawn by the editor once the card is open
    const frameId = requestAnimationFrame(measure);
    const grown = new ResizeObserver(measure);
    grown.observe(card);
    document.addEventListener('scroll', measure, { capture: true, passive: true });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frameId);
      grown.disconnect();
      document.removeEventListener('scroll', measure, { capture: true });
      window.removeEventListener('resize', measure);
      frame.style.removeProperty('--note-shift');
    };
  }, [noteId, at, box, card]);

  return { setCard, place };
}

/** Across, inside an element's padding: the app's main column pads itself clear of the sidebar */
function contentOf(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return { left: rect.left + parseFloat(style.paddingLeft), right: rect.right - parseFloat(style.paddingRight) };
}
