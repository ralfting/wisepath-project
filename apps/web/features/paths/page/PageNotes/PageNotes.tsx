'use client';

import { useId } from 'react';
import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { IconLock, IconPlus } from '@tabler/icons-react';
import type { NoteId } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { NoteItem } from './NoteItem';
import type { ListedNote } from './PageNotes.helpers';
import classes from './PageNotes.module.css';

interface PageNotesProps {
  readonly notes: ReadonlyArray<ListedNote>;
  readonly onShow: (noteId: NoteId, from: Element) => void;
  readonly onAdd: (from: Element) => void;
}

/**
 * PageNotes
 * The reader's own notes under a page, on a ground of their own so they never read as the page's text: every note in
 * the order of the text, each with the words it is on, and Add a note for one on the whole page. Nobody else sees
 * them, so anyone who can read the page may write them.
 */
export function PageNotes({ notes, onShow, onAdd }: PageNotesProps) {
  const t = useT();
  const titleId = useId();

  return (
    <Paper component="section" aria-labelledby={titleId} withBorder radius="md" p="md" bg="var(--wp-ground)">
      <Stack gap="sm">
        <Group gap="xs">
          <IconLock size={16} stroke={1.5} aria-hidden />
          <Text id={titleId} size="sm" fw={600}>
            {t('page.notes.title')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('page.notes.private')}
          </Text>
        </Group>
        {notes.length > 0 && (
          <Stack component="ul" gap="md" className={classes.list}>
            {notes.map((listed) => (
              <NoteItem key={listed.note.id} listed={listed} onShow={onShow} />
            ))}
          </Stack>
        )}
        <Group>
          <Button
            variant="subtle"
            size="compact-sm"
            color="gray"
            leftSection={<IconPlus size={14} stroke={1.5} />}
            onClick={(event) => onAdd(event.currentTarget)}
          >
            {t('page.notes.add')}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
