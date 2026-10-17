'use client';

import { Text, TextInput } from '@mantine/core';
import type { KeyboardEvent } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { formatTime } from '../timestamps';
import classes from './VideoBlock.module.css';

/**
 * The note's field and its keys (Enter adds it, Esc cancels): small in the popup by a "Note" button, large in the
 * middle of the screen in fullscreen
 */
export function NoteComposer({
  size,
  seconds,
  draft,
  onDraft,
  onClose,
}: {
  size: 'sm' | 'lg';
  seconds: number;
  draft: string;
  onDraft: (draft: string) => void;
  onClose: (save: boolean) => void;
}) {
  const t = useT();
  const keyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onClose(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose(false);
    }
  };
  return (
    <>
      <TextInput
        data-autofocus
        autoFocus={size === 'lg'}
        size={size}
        placeholder={t('video.note.placeholder')}
        aria-label={t('video.note.at', { time: formatTime(seconds) })}
        leftSection={
          <span className={classes.composerTime} data-size={size}>
            {formatTime(seconds)}
          </span>
        }
        leftSectionWidth={size === 'lg' ? 84 : 64}
        value={draft}
        onChange={(event) => onDraft(event.currentTarget.value)}
        onKeyDown={keyDown}
      />
      <Text size="xs" c="dimmed" mt={6}>
        {t('video.note.hint')}
      </Text>
    </>
  );
}
