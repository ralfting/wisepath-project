'use client';

import { useRef } from 'react';
import { Paper, Text } from '@mantine/core';
import type { Page, Path } from '@wisepath/domain/paths';
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
 * A note written in its place in the Notes tab: the words it is on, then the lean editor; Esc or a click outside the
 * note closes it
 */
export function NoteInline({ writing, path, page, actions }: NoteInlineProps) {
  const ref = useRef<HTMLDivElement>(null);
  useClosing(writing.close, ref);

  return (
    // data-note-writing: the drawer leaves an Esc from inside to the note
    <Paper ref={ref} withBorder radius="md" p="sm" data-note-writing>
      {writing.quote && (
        <Text className={classes.quote} mb="xs">
          {writing.quote.exact}
        </Text>
      )}
      <NoteEditor writing={writing} path={path} page={page} actions={actions} />
    </Paper>
  );
}
