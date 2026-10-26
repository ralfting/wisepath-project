'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Esc or a press outside closes the note open: outside `inside` when given, and outside every floating layer. Not
 * Mantine's own: a card opened from its passage leaves the cursor in the page's text, where Esc never reaches the
 * card; and floating layers (the card itself, its editor's / menu) live in portals, where a press belongs to the
 * note. The page drawer lives in a portal too, but a press in it is outside
 */
export function useClosing(onClose: () => void, inside?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const onPress = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return onClose();
      const floating = target.closest('[data-portal]') && !target.closest('.mantine-Drawer-content');
      if (floating || inside?.current?.contains(target)) return;
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
