'use client';

import { Popover } from '@mantine/core';
import type { ReactNode } from 'react';
import { NoteComposer } from './NoteComposer';

/** The note being written, in a popup by the "Note" button it was opened from */
export function NotePopover({
  opened,
  seconds,
  draft,
  onDraft,
  onClose,
  children,
}: {
  opened: boolean;
  seconds: number;
  draft: string;
  onDraft: (draft: string) => void;
  onClose: (save: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Popover opened={opened} onChange={(open) => !open && onClose(false)} position="bottom-start" shadow="md" radius="md" width={360} trapFocus withinPortal={false}>
      <Popover.Target>{children}</Popover.Target>
      <Popover.Dropdown p="xs">
        <NoteComposer size="sm" seconds={seconds} draft={draft} onDraft={onDraft} onClose={onClose} />
      </Popover.Dropdown>
    </Popover>
  );
}
