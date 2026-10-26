'use client';

import { useRef } from 'react';
import { ActionIcon, Group, Paper, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { Page, Path } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import type { PageActions } from '../PageContent/PageContent.helpers';
import { NoteEditor } from './NoteEditor';
import { useClosing } from './useClosing';
import type { NoteWriting } from './usePageNotes';
import classes from './PageNotes.module.css';

interface NoteInlineProps {
  readonly writing: NoteWriting;
  readonly path: Path;
  readonly page: Page;
  readonly actions: PageActions;
}

/**
 * NoteInline
 * A note written in its place in the Notes tab: the words it is on, then the lean editor and Delete; Esc or a click
 * outside the note closes it
 */
export function NoteInline({ writing, path, page, actions }: NoteInlineProps) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useClosing(writing.close, ref);

  return (
    // data-note-writing: the drawer leaves an Esc to the note
    <Paper ref={ref} withBorder radius="md" p="sm" data-note-writing>
      {writing.quote && (
        <Text className={classes.quote} mb="xs">
          {writing.quote.exact}
        </Text>
      )}
      <NoteEditor writing={writing} path={path} page={page} actions={actions} />
      <Group justify="flex-end" mt="xs">
        <ActionIcon variant="subtle" color="gray" aria-label={t('page.notes.delete')} title={t('page.notes.delete')} onClick={writing.remove}>
          <IconTrash size={16} stroke={1.5} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
