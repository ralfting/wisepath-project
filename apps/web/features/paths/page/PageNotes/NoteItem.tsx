'use client';

import { ActionIcon, Badge, Box, Group, Stack, UnstyledButton } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import type { NoteId } from '@wisepath/domain/paths';
import { MarkdownText } from '@/features/paths/catalog';
import { useT } from '@/i18n/I18nProvider';
import type { ListedNote } from './PageNotes.helpers';
import classes from './PageNotes.module.css';

interface NoteItemProps {
  readonly listed: ListedNote;
  readonly onShow: (noteId: NoteId, from: Element) => void;
}

/**
 * NoteItem
 * One note in the list under the page: the words it is on, quoted (a click goes to them and opens the note), and
 * what it says, read without an editor, with a button that opens it to edit
 */
export function NoteItem({ listed: { note, removed }, onShow }: NoteItemProps) {
  const t = useT();
  return (
    <Stack component="li" gap={4}>
      {note.quote && (
        <Group gap="xs" wrap="nowrap">
          <UnstyledButton
            className={classes.quote}
            data-removed={removed || undefined}
            aria-label={t('page.notes.toPassage', { quote: note.quote.exact })}
            onClick={(event) => onShow(note.id, event.currentTarget)}
          >
            {note.quote.exact}
          </UnstyledButton>
          {removed && (
            <Badge variant="light" color="gray" size="sm" className={classes.removed}>
              {t('page.notes.removed')}
            </Badge>
          )}
        </Group>
      )}
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <Box className={classes.body}>
          <MarkdownText content={note.body} hrefOf={() => null} t={t} />
        </Box>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={t('page.notes.edit')}
          title={t('page.notes.edit')}
          onClick={(event) => onShow(note.id, event.currentTarget)}
        >
          <IconPencil size={14} stroke={1.5} />
        </ActionIcon>
      </Group>
    </Stack>
  );
}
