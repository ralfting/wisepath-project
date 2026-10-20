'use client';

import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useState } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import { PLAYING } from '../youtubeApi';
import type { YouTubePlayer } from '../youtubeApi';
import { setActiveNote } from '../activeNote';
import { addNote, noteAt, notesAfter } from '../videoNotes';
import type { VideoNote } from '../videoNotes';
import { markUsed, noteMoment } from './VideoBlock.helpers';

/**
 * The video's notes: the [mm:ss] lines under it, following the text as it changes, the one for what is playing
 * marked, and the note being written, which pauses the video and plays it on once added
 */
export function useVideoNotes({
  editor,
  position,
  player,
  slot,
  stage,
  inViewRef,
  video,
  playing,
  time,
}: {
  editor: Editor;
  position: () => number | undefined;
  player: MutableRefObject<YouTubePlayer | null>;
  slot: RefObject<HTMLDivElement | null>;
  stage: RefObject<HTMLDivElement | null>;
  inViewRef: MutableRefObject<boolean>;
  video: object;
  playing: boolean;
  time: number;
}) {
  const [notes, setNotes] = useState<VideoNote[]>([]);
  useEffect(() => {
    const read = () => {
      const pos = position();
      setNotes(pos === undefined ? [] : notesAfter(editor.state.doc, pos));
    };
    read();
    editor.on('update', read);
    return () => {
      editor.off('update', read);
    };
  }, [editor, position]);

  const current = playing || time > 0 ? noteAt(notes, time) : undefined;
  useEffect(() => {
    if (playing) setActiveNote(editor, current?.pos ?? null);
  }, [editor, playing, current?.pos]);

  const [composer, setComposer] = useState<{ seconds: number; resume: boolean } | null>(null);
  const [draft, setDraft] = useState('');

  const openComposer = useCallback(() => {
    const p = player.current;
    // A page someone may only read takes no notes (the N key included)
    if (!p || !editor.isEditable) return;
    const resume = p.getPlayerState() === PLAYING;
    if (resume) p.pauseVideo();
    markUsed(video);
    // Paused out of view, nothing floats: bring the video to where the note is written
    if (!resume && !inViewRef.current) slot.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setDraft('');
    setComposer({ seconds: noteMoment(p.getCurrentTime(), resume), resume });
  }, [player, editor, video, inViewRef, slot]);

  const closeComposer = (save: boolean) => {
    if (!composer) return;
    const pos = position();
    // Nothing written, nothing added: an Enter by mistake leaves the list as it was
    if (save && pos !== undefined && draft.trim()) addNote(editor, pos, composer.seconds, draft);
    if (composer.resume) player.current?.playVideo();
    setComposer(null);
    // Back to the video, where its keys (← →, Space, N) work again
    requestAnimationFrame(() => stage.current?.focus({ preventScroll: true }));
  };

  return { notes, current, composer, draft, setDraft, openComposer, closeComposer };
}
