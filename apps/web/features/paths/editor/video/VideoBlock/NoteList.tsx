'use client';

import { Text, UnstyledButton } from '@mantine/core';
import { useEffect, useRef } from 'react';
import { useT } from '@/i18n/I18nProvider';
import type { VideoNote } from '../timestamps';
import classes from './VideoBlock.module.css';

/** The notes beside the video in fullscreen, in time order: each plays from there; the one playing now is marked */
export function NoteList({ notes, current, onSeek }: { notes: ReadonlyArray<VideoNote>; current: VideoNote | undefined; onSeek: (seconds: number) => void }) {
  const t = useT();
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    listRef.current?.querySelector('[data-current]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [current?.pos]);
  if (notes.length === 0) {
    return (
      <Text size="sm" c="dimmed" p="sm">
        {t('video.fullscreen.empty')}
      </Text>
    );
  }
  return (
    <ol ref={listRef} className={classes.notes}>
      {[...notes].sort((a, b) => a.seconds - b.seconds).map((note) => (
        <li key={note.pos}>
          <UnstyledButton className={classes.note} data-current={note.pos === current?.pos || undefined} onClick={() => onSeek(note.seconds)}>
            <span className={classes.noteTime}>{note.time}</span>
            <span className={classes.noteText}>{note.text || '—'}</span>
          </UnstyledButton>
        </li>
      ))}
    </ol>
  );
}
