'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Esc or a press outside closes the note being written: outside `inside` when given, and outside every floating
 * layer. Not Mantine's own: a card opened from its passage leaves the cursor in the page's text, where Esc never
 * reaches the card; and floating layers (the card itself, its editor's / menu) live in portals, where a press
 * belongs to the note
 */
export function useClosing(onClose: () => void, inside?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const onPress = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && (target.closest('[data-portal]') || inside?.current?.contains(target))) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPress);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPress);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, inside]);
}
