'use client';

import type { Page, Path } from '@wisepath/domain/paths';
import { MarkdownEditor } from '@/features/paths/editor';
import type { PageActions } from '../PageContent/PageContent.helpers';
import type { NoteWriting } from './usePageNotes';

interface NoteEditorProps {
  readonly writing: NoteWriting;
  readonly path: Path;
  readonly page: Page;
  readonly actions: PageActions;
}

/**
 * NoteEditor
 * The note being written, in the lean editor with the cursor at its end, saved as it is typed: the same in the card
 * by a passage and in place in the Notes tab
 */
export function NoteEditor({ writing, path, page, actions }: NoteEditorProps) {
  return (
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
      focusOnOpen="end"
    />
  );
}
