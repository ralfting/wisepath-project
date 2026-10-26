'use client';

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { ActionIcon, Box, Button, Group, Paper, Portal, Text } from '@mantine/core';
import { IconLock, IconPencil, IconTrash, IconX } from '@tabler/icons-react';
import type { Page, Path } from '@wisepath/domain/paths';
import { MarkdownText } from '@/features/paths/catalog';
import { useT } from '@/i18n/I18nProvider';
import type { PageActions } from '../PageContent/PageContent.helpers';
import { NoteEditor } from './NoteEditor';
import { useClosing } from './useClosing';
import { useFocusBack } from './useFocusBack';
import { useNoteCardPlace } from './useNoteCardPlace';
import type { NoteCardState } from './usePageNotes';
import classes from './PageNotes.module.css';

interface NoteCardProps {
  readonly card: NoteCardState;
  /** The page's text, which the card finds its passage in */
  readonly box: RefObject<HTMLElement | null>;
  readonly path: Path;
  readonly page: Page;
  readonly actions: PageActions;
}

/**
 * NoteCard
 * One of the reader's notes, in a card beside the page by the passage it is on, as a comment in Docs: read, with Edit
 * and Delete, or written in the lean editor. Esc or a click outside leaves the editor, then closes the card.
 */
export function NoteCard({ card, box, path, page, actions }: NoteCardProps) {
  const t = useT();
  const { setCard, place } = useNoteCardPlace(card.noteId, card.at, box);
  const edit = useRef<HTMLButtonElement>(null);
  const writing = card.mode === 'write';
  useClosing(writing ? card.done : card.close);
  useFocusBack(writing, edit);
  const placed = place !== null;
  useEffect(() => {
    if (card.focus && placed) edit.current?.focus({ preventScroll: true });
  }, [card.focus, card.noteId, placed]);

  return (
    <Portal>
      {/* data-note-writing: the drawer leaves an Esc to the note */}
      <Paper
        ref={setCard}
        withBorder
        shadow="md"
        radius="md"
        p="sm"
        role="dialog"
        aria-label={t('page.notes.card')}
        data-note-writing
        className={classes.card}
        style={place ? { top: place.top, left: place.left } : undefined}
      >
        <Group gap="xs" wrap="nowrap" mb="xs">
          <Group gap="xs" c="dimmed" wrap="nowrap">
            <IconLock size={14} stroke={1.5} aria-hidden />
            <Text size="xs">{t('page.notes.private')}</Text>
          </Group>
          <Group gap={2} wrap="nowrap" ml="auto">
            {!writing && (
              <ActionIcon ref={edit} variant="subtle" color="gray" aria-label={t('page.notes.edit')} title={t('page.notes.edit')} onClick={card.edit}>
                <IconPencil size={16} stroke={1.5} />
              </ActionIcon>
            )}
            <ActionIcon variant="subtle" color="gray" aria-label={t('page.notes.delete')} title={t('page.notes.delete')} onClick={card.remove}>
              <IconTrash size={16} stroke={1.5} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="gray" aria-label={t('page.notes.close')} title={t('page.notes.close')} onClick={card.close}>
              <IconX size={16} stroke={1.5} />
            </ActionIcon>
          </Group>
        </Group>
        {card.quote && (
          <Text className={classes.quote} mb="xs">
            {card.quote.exact}
          </Text>
        )}
        <Box className={classes.cardBody}>
          {writing ? (
            <NoteEditor writing={card} path={path} page={page} actions={actions} />
          ) : (
            <MarkdownText content={card.body} hrefOf={() => null} t={t} />
          )}
        </Box>
        {writing && (
          <Group justify="flex-end" mt="xs">
            <Button variant="light" size="compact-sm" onClick={card.done}>
              {t('page.notes.done')}
            </Button>
          </Group>
        )}
      </Paper>
    </Portal>
  );
}
