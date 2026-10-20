'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { markUsed } from './VideoBlock.helpers';

/** The Keyboard Lock API: Chromium only, and not in TypeScript's DOM types */
type KeyboardLock = { lock?: (keys: string[]) => Promise<void>; unlock?: () => void };
const keyboard = () => (navigator as Navigator & { keyboard?: KeyboardLock }).keyboard;

/** Our own fullscreen: the video with its notes beside it, which the browser's video-only fullscreen can't show */
export function useVideoFullscreen({ stage, video }: { stage: RefObject<HTMLDivElement | null>; video: object }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const locked = useRef(false);
  useEffect(() => {
    const onChange = () => {
      const on = !!stage.current && document.fullscreenElement === stage.current;
      setFullscreen(on);
      // The browser would leave fullscreen on Esc before the page saw it; locked, Esc reaches the page, which
      // cancels a note first, and holding it still leaves. Elsewhere than Chromium, Esc leaves at once as before
      if (on && !locked.current) {
        locked.current = true;
        keyboard()?.lock?.(['Escape']).catch(() => {});
      } else if (!on && locked.current) {
        locked.current = false;
        keyboard()?.unlock?.();
      }
      // The button that opened it goes away: the video takes the focus, so its keys work from the start
      if (on) {
        markUsed(video);
        stage.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      // Gone while fullscreen, the block hears no fullscreenchange: the lock would hold Esc for the whole tab
      if (locked.current) {
        locked.current = false;
        keyboard()?.unlock?.();
      }
    };
  }, [stage, video]);
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.current?.requestFullscreen();
  };
  // For the key listener, which is added once
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  return { fullscreen, showNotes, toggle, toggleRef, toggleNotes: () => setShowNotes((s) => !s) };
}
