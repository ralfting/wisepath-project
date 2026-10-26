'use client';

import { useEffect } from 'react';
import { ActionIcon, Box, Group, Popover, Text } from '@mantine/core';
import { IconLock, IconTrash } from '@tabler/icons-react';
import type { Page, Path } from '@wisepath/domain/paths';
import { MarkdownEditor } from '@/features/paths/editor';
import { useT } from '@/i18n/I18nProvider';
import type { PageActions } from '../PageContent/PageContent.helpers';
import type { OpenNote } from './usePageNotes';
import classes from './PageNotes.module.css';

interface NoteCardProps {
  readonly open: OpenNote;
  readonly body: string;
  readonly path: Path;
  readonly page: Page;
  readonly actions: PageActions;
  readonly onWrite: (body: string) => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}

/**
 * NoteCard
 * One of the reader's notes, open by the passage it is on (or its place in the list): written in the lean editor,
 * deleted from here, closed with Esc or a click outside.
 */
export function NoteCard({ open, body, path, page, actions, onWrite, onDelete, onClose }: NoteCardProps) {
  const t = useT();
  useClosing(onClose);

  return (
    <Popover opened closeOnEscape={false} closeOnClickOutside={false} withRoles={false} position="bottom-start" shadow="md" withinPortal returnFocus>
      <Popover.Target>
        {/* Nothing to see: only where the card points, placed over the passage at runtime */}
        <Box pos="absolute" aria-hidden className={classes.spot} style={{ top: open.spot.top, left: open.spot.left, width: open.spot.width, height: open.spot.height }} />
      </Popover.Target>
      <Popover.Dropdown className={classes.card} role="dialog" aria-label={t('page.notes.card')}>
        <MarkdownEditor
          key={open.noteId}
          variant="notes"
          content={body}
          onChange={onWrite}
          pages={path.pages}
          currentPageId={page.id}
          onOpenPage={actions.openPage}
          onLinkPage={() => {}}
          onCreatePage={actions.createLinkedPage}
          onCreatePageHere={actions.createPage}
          focusOnOpen={open.fresh ? 'end' : null}
        />
        <Group justify="space-between" gap="xs" mt="xs">
          <Group gap="xs" c="dimmed">
            <IconLock size={14} stroke={1.5} aria-hidden />
            <Text size="xs">{t('page.notes.private')}</Text>
          </Group>
          <ActionIcon variant="subtle" color="gray" aria-label={t('page.notes.delete')} title={t('page.notes.delete')} onClick={onDelete}>
            <IconTrash size={16} stroke={1.5} />
          </ActionIcon>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}

/**
 * Esc or a press outside closes the card. Not Mantine's own: a card opened from its passage leaves the cursor in the
 * page's text, where Esc never reaches the card; and floating layers (the card itself, its editor's / menu) live in
 * portals outside the card, where a press belongs to the card
 */
function useClosing(onClose: () => void) {
  useEffect(() => {
    const onPress = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-portal]')) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPress);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPress);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
}
