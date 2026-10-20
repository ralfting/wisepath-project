'use client';

import { useEffect } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import { PLAYING } from '../youtubeApi';
import type { YouTubePlayer } from '../youtubeApi';
import { isLastUsed, SKIP_SECONDS } from './VideoBlock.helpers';

/**
 * The block's keys: YouTube's own on the video (Space or K plays and pauses, ← → skip 5 seconds, M mutes, F is
 * fullscreen, and Esc leaves it), listened to on the element ahead of the editor, which would move its cursor on the
 * arrows; and N for a note, in fullscreen or with the focus on the page rather than in a field or the video
 */
export function useVideoKeys({
  stage,
  player,
  setTime,
  toggleFullscreen,
  writingNote,
  openComposer,
  video,
}: {
  stage: RefObject<HTMLDivElement | null>;
  player: MutableRefObject<YouTubePlayer | null>;
  setTime: (seconds: number) => void;
  toggleFullscreen: MutableRefObject<() => void>;
  writingNote: boolean;
  openComposer: () => void;
  video: object;
}) {
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onKey = (event: KeyboardEvent) => {
      const p = player.current;
      const target = event.target as HTMLElement;
      if (!p || event.metaKey || event.ctrlKey || event.altKey) return;
      // On the video or any of its buttons (the notes beside it in fullscreen too); a field keeps its keys
      if (!el.contains(target) || target.closest('input, textarea, select') || target.isContentEditable) return;
      const key = event.key.toLowerCase();
      // Space on a button presses it; K always plays and pauses
      if (key === ' ' && target !== el) return;
      if (key === ' ' || key === 'k') {
        if (p.getPlayerState() === PLAYING) p.pauseVideo();
        else p.playVideo();
      } else if (key === 'arrowleft' || key === 'arrowright') {
        const to = Math.max(0, p.getCurrentTime() + (key === 'arrowleft' ? -SKIP_SECONDS : SKIP_SECONDS));
        p.seekTo(to, true);
        setTime(to);
      } else if (key === 'm') {
        if (p.isMuted()) p.unMute();
        else p.mute();
      } else if (key === 'f' || (key === 'escape' && document.fullscreenElement === el)) {
        toggleFullscreen.current();
      } else {
        return;
      }
      event.preventDefault();
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [stage, player, setTime, toggleFullscreen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'n' || event.metaKey || event.ctrlKey || event.altKey || writingNote) return;
      const target = event.target as HTMLElement | null;
      // Typing somewhere (a field, the page's text) keeps the n; the block's own controls aren't editable
      if (target?.isContentEditable || target?.closest('input, textarea, select')) return;
      const inStage = !!stage.current && document.fullscreenElement === stage.current;
      if (!inStage && (document.fullscreenElement || !isLastUsed(video))) return;
      event.preventDefault();
      openComposer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [writingNote, openComposer, video, stage]);
}
