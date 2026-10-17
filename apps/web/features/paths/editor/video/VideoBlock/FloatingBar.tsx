'use client';

import { ActionIcon, Button, Group, Tooltip } from '@mantine/core';
import { IconArrowBackUp, IconGripHorizontal, IconPlus, IconX } from '@tabler/icons-react';
import type { PointerEvent, ReactNode } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { formatTime } from '../timestamps';
import classes from './VideoBlock.module.css';

/**
 * The floating video's bar: the handle it is dragged by, its own "Note" button (its popup comes in `notePopover`),
 * the way back to its place in the text, and stopping it from floating
 */
export function FloatingBar({
  seconds,
  onDrag,
  onNote,
  onBack,
  onStop,
  notePopover,
}: {
  seconds: number;
  onDrag: (event: PointerEvent<HTMLElement>) => void;
  /** None on a page someone may only read: no Note button */
  onNote?: () => void;
  onBack: () => void;
  onStop: () => void;
  notePopover: (target: ReactNode) => ReactNode;
}) {
  const t = useT();
  return (
    <div className={classes.handle} onPointerDown={onDrag} title={t('video.floating.drag')}>
      <IconGripHorizontal size={16} className={classes.grip} aria-hidden />
      {onNote &&
        notePopover(
          <Button size="compact-xs" variant="light" leftSection={<IconPlus size={12} />} onClick={onNote}>
            {t('video.note.at', { time: formatTime(seconds) })}
          </Button>,
        )}
      <Group gap={2} wrap="nowrap" ml="auto">
        <Tooltip label={t('video.floating.back')}>
          <ActionIcon size="sm" variant="subtle" color="gray" aria-label={t('video.floating.back')} onClick={onBack}>
            <IconArrowBackUp size={15} />
          </ActionIcon>
        </Tooltip>
        <ActionIcon size="sm" variant="subtle" color="gray" aria-label={t('video.floating.stop')} onClick={onStop}>
          <IconX size={15} />
        </ActionIcon>
      </Group>
    </div>
  );
}
