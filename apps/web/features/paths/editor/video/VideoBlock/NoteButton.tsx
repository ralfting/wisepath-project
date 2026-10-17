'use client';

import { Button, Kbd, Tooltip } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import { formatTime } from '../timestamps';

/** "Note at 01:25": pauses the video and asks for a line (N does the same) */
export function NoteButton({ seconds, writing, ready, onOpen }: { seconds: number; writing: boolean; ready: boolean; onOpen: () => void }) {
  const t = useT();
  return (
    <Tooltip
      label={
        <>
          {t('video.note.tooltip')} <Kbd size="xs">N</Kbd>
        </>
      }
      disabled={writing}
    >
      <Button size="compact-sm" variant="light" leftSection={<IconPlus size={14} />} onClick={onOpen} disabled={!ready} onMouseDown={(event) => event.preventDefault()}>
        {t('video.note.at', { time: formatTime(seconds) })}
      </Button>
    </Tooltip>
  );
}
