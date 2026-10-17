'use client';

import { useEffect, useRef } from 'react';

/**
 * A ref whose element gets the focus once it is on screen, a frame after mounting. autoFocus alone loses a race
 * inside a dialog: when the field before it leaves, the dialog's focus trap moves the focus to the first thing it
 * finds, after autoFocus has run.
 */
export function useFocusOnMount<E extends HTMLElement>() {
  const element = useRef<E>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => element.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  return element;
}
