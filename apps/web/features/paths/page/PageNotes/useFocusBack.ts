'use client';

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/** Once `active` ends with the focus lost (the field that had it is gone), the focus goes to `target` */
export function useFocusBack(active: boolean, target: RefObject<HTMLElement | null>) {
  const was = useRef(active);
  useEffect(() => {
    const lost = document.activeElement === null || document.activeElement === document.body;
    if (was.current && !active && lost) target.current?.focus();
    was.current = active;
  }, [active, target]);
}
