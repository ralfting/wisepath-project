'use client';

import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { LOAD_TIMEOUT_MS, PAUSED, PLAYING, loadYouTubeApi } from '../youtubeApi';
import type { YouTubePlayer } from '../youtubeApi';
import { pauseOthers, registerVideo } from '../videos';
import { markUsed } from './VideoBlock.helpers';

/**
 * YouTube's player on the block's iframe: loading it (failed when neither the API nor the video answers in time;
 * Retry reloads both), playing and the time while it plays, and the control the editor's times use to play from a
 * moment (seek) or pause. Playing pauses the page's other videos.
 */
export function useVideoPlayer({
  editor,
  src,
  iframe,
  stage,
  video,
  position,
  reclaimFocus,
  onSeek,
}: {
  editor: Editor;
  src: string;
  iframe: RefObject<HTMLIFrameElement | null>;
  stage: RefObject<HTMLDivElement | null>;
  video: object;
  position: () => number | undefined;
  reclaimFocus: () => void;
  onSeek: () => void;
}) {
  const player = useRef<YouTubePlayer | null>(null);
  const [ready, setReady] = useState(false);
  // YouTube didn't answer (offline, blocked): the notes can't follow the video, and the block says so
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;
  const seek = useCallback(
    (seconds: number, fullscreen = false) => {
      markUsed(video);
      onSeekRef.current();
      const p = player.current;
      if (!p) return;
      p.seekTo(seconds, true);
      p.playVideo();
      setTime(seconds);
      // In fullscreen, a time picked from the notes hands the focus to the video, where the arrows move it on
      const el = stage.current;
      if (el && document.fullscreenElement === el) requestAnimationFrame(() => el.focus({ preventScroll: true }));
      // Asked for in fullscreen (⇧⌘↵, ⇧-click): the browser allows it only now, while the key or click is going on
      else if (el && fullscreen) void el.requestFullscreen();
    },
    [video, stage],
  );
  const control = useMemo(() => ({ getPos: position, seek, pause: () => player.current?.pauseVideo() }), [position, seek]);
  const controlRef = useRef(control);
  controlRef.current = control;
  useEffect(() => registerVideo(editor, control), [editor, control]);

  useEffect(() => {
    let cancelled = false;
    const el = iframe.current;
    if (!el) return;
    if (attempt > 0) el.src = src;
    const timer = setTimeout(() => !cancelled && setFailed(true), LOAD_TIMEOUT_MS + 3000);
    const fail = () => {
      if (cancelled) return;
      clearTimeout(timer);
      setFailed(true);
    };
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      player.current = new YT.Player(el, {
        events: {
          onReady: () => {
            clearTimeout(timer);
            setFailed(false);
            setReady(true);
          },
          onStateChange: (event) => {
            setPlaying(event.data === PLAYING);
            if (event.data === PLAYING) {
              markUsed(video);
              pauseOthers(editor, controlRef.current);
            }
            setTime(player.current?.getCurrentTime() ?? 0);
            // Played or paused from YouTube's own controls: no menu of its is open, so N can work again
            if (event.data === PLAYING || event.data === PAUSED) reclaimFocus();
          },
        },
      });
    }, fail);
    // Let go without destroy(), which takes the iframe out of the page: the block owns it
    return () => {
      cancelled = true;
      clearTimeout(timer);
      player.current = null;
    };
    // The editor stays the same for the block's life
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video, attempt, src, reclaimFocus]);

  // The clock, while playing: for the button's time and the note to mark
  useEffect(() => {
    if (!playing) return;
    const tick = setInterval(() => setTime(player.current?.getCurrentTime() ?? 0), 400);
    return () => clearInterval(tick);
  }, [playing]);

  return {
    player,
    state: { ready, failed, playing, time },
    operations: {
      seek,
      setTime,
      retry: () => {
        setFailed(false);
        setAttempt((n) => n + 1);
      },
    },
  };
}
