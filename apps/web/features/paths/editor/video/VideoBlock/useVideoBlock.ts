'use client';

import type { NodeViewProps } from '@tiptap/react';
import { useCallback, useRef, useState } from 'react';
import { useReducedMotion } from '@mantine/hooks';
import { useHasKeyboard } from '@/ui/platform';
import { youTubeId } from '../../youtube';
import { embedUrl } from '../youtubeApi';
import { useFloatingVideo } from './useFloatingVideo';
import { useVideoFocus } from './useVideoFocus';
import { useVideoFullscreen } from './useVideoFullscreen';
import { useVideoKeys } from './useVideoKeys';
import { useVideoNotes } from './useVideoNotes';
import { useVideoPlayer } from './useVideoPlayer';
import { useVideoVisibility } from './useVideoVisibility';

/** The video block's view model: its player, notes, floating, fullscreen and keys, over the block's elements */
export function useVideoBlock({ node, editor, getPos }: Pick<NodeViewProps, 'node' | 'editor' | 'getPos'>) {
  const videoId = youTubeId(node.attrs.src ?? '');
  const iframe = useRef<HTMLIFrameElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  // This block, for "the video most recently used"
  const video = useRef({}).current;
  const hasKeyboard = useHasKeyboard();
  const reduceMotion = useReducedMotion();
  // The embed address is fixed once: changing it would reload the video
  const [src] = useState(() => (videoId ? embedUrl(videoId, Number(node.attrs.start) || 0) : ''));
  const position = useCallback(() => (typeof getPos === 'function' ? getPos() : undefined), [getPos]);

  const reclaimFocus = useVideoFocus({ iframe, stage, video });
  const visibility = useVideoVisibility(slot);
  const fullscreen = useVideoFullscreen({ stage, video });
  // Played from a time in the text with the video out of view, the page goes to the video; it floats again only
  // once it has been in view, so it doesn't flash in a corner on the way
  const showVideo = () => {
    if (visibility.inViewRef.current || document.fullscreenElement) return visibility.undismiss();
    visibility.dismiss();
    slot.current?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  const player = useVideoPlayer({ editor, src, iframe, stage, video, position, reclaimFocus, onSeek: showVideo });
  const notes = useVideoNotes({
    editor,
    position,
    player: player.player,
    slot,
    stage,
    inViewRef: visibility.inViewRef,
    video,
    playing: player.state.playing,
    time: player.state.time,
  });
  const writingNote = notes.composer !== null;
  const floating = useFloatingVideo({
    slot,
    stage,
    playing: player.state.playing,
    writingNote: !!notes.composer?.resume,
    inView: visibility.inView,
    dismissed: visibility.dismissed,
    fullscreen: fullscreen.fullscreen,
  });
  useVideoKeys({
    stage,
    player: player.player,
    setTime: player.operations.setTime,
    toggleFullscreen: fullscreen.toggleRef,
    writingNote,
    openComposer: notes.openComposer,
    video,
  });

  return { videoId, src, iframe, slot, stage, hasKeyboard, player, notes, floating, fullscreen, visibility };
}
