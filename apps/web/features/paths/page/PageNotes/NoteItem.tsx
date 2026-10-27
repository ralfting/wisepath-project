'use client';

import { useRef } from 'react';
import { ActionIcon, Badge, Box, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconCheck, IconPencil } from '@tabler/icons-react';
import type { NoteId, Page, PageNote, Path } from '@wisepath/domain/paths';
import { MarkdownText } from '@/features/paths/catalog';
import { useT } from '@/i18n/I18nProvider';
import type { PageActions } from '../PageContent/PageContent.helpers';
import { NoteInline } from './NoteInline';
import { useFocusBack } from './useFocusBack';
import type { NoteWriting } from './usePageNotes';
import classes from './PageNotes.module.css';

interface NoteItemProps {
  readonly note: Pick<PageNote, 'id' | 'quote' | 'body'>;
  /** The words it was made on are no longer in the text */
  readonly removed: boolean;
  /** Set while this note is written in place */
  readonly writing: NoteWriting | null;
  /** Just closed after writing it here: says, for a moment, that it is saved */
  readonly justSaved: boolean;
  readonly path: Path;
  readonly page: Page;
  readonly actions: PageActions;
  readonly onShow: (noteId: NoteId) => void;
  readonly onEdit: (noteId: NoteId) => void;
}

/**
 * NoteItem
 * One note in the Notes tab: the words it is on, quoted (a click goes to them in the text and opens the note there),
 * and what it says, read without an editor; the pencil or a double click writes it in place
 */
export function NoteItem({ note, removed, writing, justSaved, path, page, actions, onShow, onEdit }: NoteItemProps) {
  const t = useT();
  const edit = useRef<HTMLButtonElement>(null);
  useFocusBack(writing !== null, edit);

  if (writing) {
    return (
      <Stack component="li" gap={4}>
        <NoteInline writing={writing} path={path} page={page} actions={actions} />
      </Stack>
    );
  }
  return (
    <Stack component="li" gap={4}>
      {note.quote && (
        <Group gap="xs" wrap="nowrap">
          {removed ? (
            <Text className={classes.quote} data-removed>
              {note.quote.exact}
            </Text>
          ) : (
            <UnstyledButton className={classes.quote} aria-label={t('page.notes.toPassage', { quote: note.quote.exact })} onClick={() => onShow(note.id)}>
              {note.quote.exact}
            </UnstyledButton>
          )}
          {removed && (
            <Badge variant="light" color="gray" size="sm" className={classes.removed}>
              {t('page.notes.removed')}
            </Badge>
          )}
        </Group>
      )}
      <Group gap="xs" wrap="nowrap" align="flex-start">
        {/* The pencil beside it is the way in from the keyboard */}
        <Box className={classes.body} onDoubleClick={() => onEdit(note.id)}>
          <MarkdownText content={note.body} hrefOf={() => null} t={t} />
        </Box>
        {/* Always there, empty until a note is closed, so a screen reader hears it when it says something */}
        <Text component="span" role="status" size="xs" c="dimmed" className={classes.saved}>
          {justSaved && (
            <>
              <IconCheck size={12} stroke={2} aria-hidden />
              {t('page.notes.saved')}
            </>
          )}
        </Text>
        <ActionIcon ref={edit} variant="subtle" color="gray" size="sm" aria-label={t('page.notes.edit')} title={t('page.notes.edit')} onClick={() => onEdit(note.id)}>
          <IconPencil size={14} stroke={1.5} />
        </ActionIcon>
      </Group>
    </Stack>
  );
}
