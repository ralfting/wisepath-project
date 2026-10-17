'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/** Whether the video's place in the text is in view, and whether its floating was closed until it is again */
export function useVideoVisibility(slot: RefObject<HTMLDivElement | null>) {
  const [inView, setInView] = useState(true);
  const inViewRef = useRef(true);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const el = slot.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) setDismissed(false);
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [slot]);
  return { inView, inViewRef, dismissed, dismiss: () => setDismissed(true), undismiss: () => setDismissed(false) };
}
