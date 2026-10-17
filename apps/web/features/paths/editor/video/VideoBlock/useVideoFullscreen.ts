'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { markUsed } from './VideoBlock.helpers';

/** Our own fullscreen: the video with its notes beside it, which the browser's video-only fullscreen can't show */
export function useVideoFullscreen({ stage, video }: { stage: RefObject<HTMLDivElement | null>; video: object }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  useEffect(() => {
    const onChange = () => {
      const on = !!stage.current && document.fullscreenElement === stage.current;
      setFullscreen(on);
      // The button that opened it goes away: the video takes the focus, so its keys work from the start
      if (on) {
        markUsed(video);
        stage.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
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
