'use client';

import { useState } from 'react';
import type { Page, Path } from '@wisepath/domain/paths';
import { canEdit } from '@wisepath/domain/paths';
import { MarkdownEditor } from '@/features/paths/editor';
import type { EditorFocus } from '@/features/paths/editor';
import { Stack } from '@mantine/core';
import { useInbox, useTakeFromInbox } from '@/useCases/inbox';
import { PageNotes } from '../PageNotes/PageNotes';
import { PagePager } from './PagePager';
import { PageTitleInput } from './PageTitleInput';
import type { PageActions } from './PageContent.helpers';

/**
 * PageContent
 * One page's title and markdown, edited in place, or read by someone who may
 * not edit them, and the reader's own notes under them. Used by the map's side
 * panel and by the full-screen page.
 */

interface PageContentProps {
  path: Path;
  page: Page;
  actions: PageActions;
  /** Show the title field; the side panel shows the title in its own header */
  showTitle?: boolean;
  /** Title size in px: larger on the full-screen page */
  titleSize?: number;
  /** Where the editor's sticky toolbar stops, below any sticky header */
  toolbarOffset?: number;
  /** Puts the cursor in the text on open */
  focusEditor?: EditorFocus | null;
  onCursor?: (pos: number) => void;
  /** Increment to move the cursor to the end of the text (Enter in a title shown elsewhere) */
  focusSignal?: number;
}

export function PageContent({
  path,
  page,
  actions,
  showTitle = true,
  titleSize = 32,
  toolbarOffset = 0,
  focusEditor = null,
  onCursor,
  focusSignal: outsideFocusSignal = 0,
}: PageContentProps) {
  const [focusSignal, setFocusSignal] = useState(0);
  // The / command's Inbox items: one put in the text leaves the Inbox once this map is saved
  const waiting = useInbox();
  const take = useTakeFromInbox();

  return (
    <Stack gap="md">
      {showTitle && (
        <PageTitleInput
          path={path}
          page={page}
          actions={actions}
          size={titleSize}
          onEnter={() => setFocusSignal((n) => n + 1)}
        />
      )}
      <MarkdownEditor
        key={page.id}
        content={page.content}
        onChange={(content) => actions.updatePage(page.id, { content })}
        pages={path.pages}
        currentPageId={page.id}
        onOpenPage={actions.openPage}
        onLinkPage={() => {}}
        onCreatePage={actions.createLinkedPage}
        onCreatePageHere={actions.createPage}
        focusSignal={focusSignal + outsideFocusSignal}
        toolbarOffset={toolbarOffset}
        focusOnOpen={focusEditor}
        onCursor={onCursor}
        readOnly={!canEdit(path.access)}
        inbox={{ items: waiting.status === 'ready' ? waiting.items : null, onTaken: (item) => void take(item, path.id) }}
      />
      <PageNotes path={path} page={page} actions={actions} />
      <PagePager path={path} page={page} onOpen={actions.openPage} />
    </Stack>
  );
}
