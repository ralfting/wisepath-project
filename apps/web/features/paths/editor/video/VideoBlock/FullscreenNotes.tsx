'use client';

import { ActionIcon, Group } from '@mantine/core';
import { IconArrowsMinimize, IconLayoutSidebarRightCollapse, IconLayoutSidebarRightExpand } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useT } from '@/i18n/I18nProvider';
import type { VideoNote } from '../videoNotes';
import classes from './VideoBlock.module.css';
import { NoteList } from './NoteList';

/** In fullscreen, the column beside the video: its "Note" button, hiding the notes, leaving fullscreen, the notes */
export function FullscreenNotes({
  noteButton,
  showNotes,
  notes,
  current,
  onToggleNotes,
  onExit,
  onSeek,
}: {
  noteButton: ReactNode;
  showNotes: boolean;
  notes: ReadonlyArray<VideoNote>;
  current: VideoNote | undefined;
  onToggleNotes: () => void;
  onExit: () => void;
  onSeek: (seconds: number) => void;
}) {
  const t = useT();
  return (
    <aside className={classes.side} aria-label={t('video.fullscreen.notes')}>
      <Group justify="space-between" wrap="nowrap" gap="xs" className={classes.sideHead}>
        {noteButton}
        <Group gap={4} wrap="nowrap">
          <ActionIcon variant="subtle" color="gray" onClick={onToggleNotes} aria-label={showNotes ? t('video.fullscreen.hideNotes') : t('video.fullscreen.showNotes')}>
            {showNotes ? <IconLayoutSidebarRightCollapse size={18} /> : <IconLayoutSidebarRightExpand size={18} />}
          </ActionIcon>
          <ActionIcon variant="subtle" color="gray" onClick={onExit} aria-label={t('video.fullscreen.exit')}>
            <IconArrowsMinimize size={18} />
          </ActionIcon>
        </Group>
      </Group>
      {showNotes && <NoteList notes={notes} current={current} onSeek={onSeek} />}
    </aside>
  );
}
