'use client';

import type { ReactNode } from 'react';
import { ActionIcon, Group } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { Page, Path } from '@wisepath/domain/paths';
import { MarkdownEditor } from '@/features/paths/editor';
import { useT } from '@/i18n/I18nProvider';
import type { PageActions } from '../PageContent/PageContent.helpers';
import type { NoteWriting } from './usePageNotes';

interface NoteEditorProps {
  readonly writing: NoteWriting;
  readonly path: Path;
  readonly page: Page;
  readonly actions: PageActions;
  /** Shown left of Delete */
  readonly children?: ReactNode;
}

/**
 * NoteEditor
 * The note being written, in the lean editor, saved as it is typed, with Delete: the same in the card by a passage
 * and in place in the Notes tab
 */
export function NoteEditor({ writing, path, page, actions, children }: NoteEditorProps) {
  const t = useT();
  return (
    <>
      <MarkdownEditor
        key={writing.noteId}
        variant="notes"
        content={writing.body}
        onChange={writing.write}
        pages={path.pages}
        currentPageId={page.id}
        onOpenPage={actions.openPage}
        onLinkPage={() => {}}
        onCreatePage={actions.createLinkedPage}
        onCreatePageHere={actions.createPage}
        focusOnOpen={writing.focus ? 'end' : null}
      />
      <Group gap="xs" mt="xs">
        {children}
        <ActionIcon ml="auto" variant="subtle" color="gray" aria-label={t('page.notes.delete')} title={t('page.notes.delete')} onClick={writing.remove}>
          <IconTrash size={16} stroke={1.5} />
        </ActionIcon>
      </Group>
    </>
  );
}
