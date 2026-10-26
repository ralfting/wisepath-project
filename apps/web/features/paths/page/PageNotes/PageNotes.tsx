'use client';

import { useRef } from 'react';
import { Button, Group, Stack, Text } from '@mantine/core';
import { IconLock, IconPlus } from '@tabler/icons-react';
import type { Page, PageNote, Path } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import type { PageActions } from '../PageContent/PageContent.helpers';
import { NoteItem } from './NoteItem';
import { useFocusBack } from './useFocusBack';
import type { PageNotesState } from './usePageNotes';
import classes from './PageNotes.module.css';

interface PageNotesProps {
  readonly list: PageNotesState['list'];
  readonly path: Path;
  readonly page: Page;
  readonly actions: PageActions;
}

/**
 * PageNotes
 * The Notes tab: the reader's own notes on the page, in the order of the text, each with the words it is on, and Add
 * a note for one on the whole page. Nobody else sees them, so anyone who can read the page may write them.
 */
export function PageNotes({ list, path, page, actions }: PageNotesProps) {
  const t = useT();
  const add = useRef<HTMLButtonElement>(null);
  const draft = list.writing && !list.writing.saved ? list.writing : null;
  useFocusBack(draft !== null, add);
  // One array, so a new note keeps its editor (and the cursor) once it is saved and joins the others
  const items: ReadonlyArray<{ note: Pick<PageNote, 'id' | 'quote' | 'body'>; removed: boolean }> = [
    ...list.notes,
    ...(draft ? [{ note: { id: draft.noteId, body: '' }, removed: false }] : []),
  ];

  return (
    <Stack gap="md">
      <Group gap="xs" c="dimmed">
        <IconLock size={14} stroke={1.5} aria-hidden />
        <Text size="xs">{t('page.notes.private')}</Text>
      </Group>
      {items.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t('page.notes.empty')}
        </Text>
      ) : (
        <Stack component="ul" gap="md" className={classes.list}>
          {items.map(({ note, removed }) => (
            <NoteItem
              key={note.id}
              note={note}
              removed={removed}
              writing={list.writing?.noteId === note.id ? list.writing : null}
              path={path}
              page={page}
              actions={actions}
              onShow={list.show}
              onEdit={list.edit}
            />
          ))}
        </Stack>
      )}
      <Group>
        <Button ref={add} variant="subtle" size="compact-sm" color="gray" leftSection={<IconPlus size={14} stroke={1.5} />} onClick={list.add}>
          {t('page.notes.add')}
        </Button>
      </Group>
    </Stack>
  );
}
