'use client';

import { useCallback, useEffect } from 'react';
import type { RefObject } from 'react';
import { isControlDone, markUsed } from './VideoBlock.helpers';

/**
 * Taking the focus back from YouTube's frame, where keys never reach the page, onto the block, which answers them.
 * Taking it at once would close YouTube's menus, so it waits until one of its controls has done its part, or until
 * the pointer is back on the page.
 */
export function useVideoFocus({ iframe, stage, video }: { iframe: RefObject<HTMLIFrameElement | null>; stage: RefObject<HTMLDivElement | null>; video: object }) {
  const reclaimFocus = useCallback(() => {
    if (document.activeElement !== iframe.current) return;
    markUsed(video);
    stage.current?.focus({ preventScroll: true });
  }, [iframe, stage, video]);

  // A while after the last of its messages (a volume being dragged sends many)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.current?.contentWindow || !isControlDone(event.data)) return;
      clearTimeout(timer);
      timer = setTimeout(reclaimFocus, 700);
    };
    window.addEventListener('message', onMessage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    };
  }, [iframe, reclaimFocus]);

  // The pointer back on the page after using YouTube's controls: N, and the block's keys, work again
  useEffect(() => {
    const onMove = () => reclaimFocus();
    document.addEventListener('pointermove', onMove);
    return () => document.removeEventListener('pointermove', onMove);
  }, [reclaimFocus]);

  return reclaimFocus;
}
