'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Page, Project } from '@wisepath/domain/projects';
import { titleTaken } from '@wisepath/domain/projects';
import { MarkdownEditor } from '@/features/editor/MarkdownEditor';
import type { EditorFocus } from '@/features/editor/MarkdownEditor';
import { Stack, TextInput } from '@mantine/core';
import classes from './PageContent.module.css';

/**
 * PageContent
 * One page's title and markdown, edited in place. Used by the map's side
 * panel and by the full-screen page.
 */

export interface PageActions {
  updatePage: (pageId: string, patch: Partial<Pick<Page, 'title' | 'content' | 'studied'>>) => void;
  /** A title starts being edited: links to the page follow it as it is typed */
  beginRename: (pageId: string) => void;
  /** Rewrites [[Old]] links across the project after a rename, ending it */
  renameLinks: (oldTitle: string, newTitle: string) => void;
  openPage: (pageId: string) => void;
  /** Creates the page a [[link]] already points to, and opens it */
  createLinkedPage: (title: string) => void;
  /** Creates the page a [[link]] already points to, and stays here */
  createPage: (title: string) => void;
}

interface PageContentProps {
  project: Project;
  page: Page;
  actions: PageActions;
  /** Focus the title on mount, for a page just created */
  isFresh?: boolean;
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
  project,
  page,
  actions,
  isFresh = false,
  showTitle = true,
  titleSize = 32,
  toolbarOffset = 0,
  focusEditor = null,
  onCursor,
  focusSignal: outsideFocusSignal = 0,
}: PageContentProps) {
  const [focusSignal, setFocusSignal] = useState(0);

  return (
    <Stack gap="md">
      {showTitle && (
        <PageTitleInput
          project={project}
          page={page}
          actions={actions}
          autoFocus={isFresh}
          size={titleSize}
          onEnter={() => setFocusSignal((n) => n + 1)}
        />
      )}
      <MarkdownEditor
        key={page.id}
        content={page.content}
        onChange={(content) => actions.updatePage(page.id, { content })}
        pages={project.pages}
        currentPageId={page.id}
        onOpenPage={actions.openPage}
        onLinkPage={() => {}}
        onCreatePage={actions.createLinkedPage}
        onCreatePageHere={actions.createPage}
        focusSignal={focusSignal + outsideFocusSignal}
        toolbarOffset={toolbarOffset}
        focusOnOpen={focusEditor}
        onCursor={onCursor}
      />
    </Stack>
  );
}

/**
 * The page title, edited in place. Links to the page follow the new name when
 * editing ends. A title another page has would make [[links]] ambiguous, so it
 * shows an error and is not saved; leaving the field then restores the title
 * the page had before editing.
 */
export function PageTitleInput({
  project,
  page,
  actions,
  autoFocus = false,
  size = 32,
  onEnter,
}: {
  project: Project;
  page: Page;
  actions: Pick<PageActions, 'updatePage' | 'beginRename' | 'renameLinks'>;
  autoFocus?: boolean;
  size?: number;
  onEnter?: () => void;
}) {
  const titleAtFocus = useRef(page.title);
  const [draft, setDraft] = useState(page.title);
  const clash = titleTaken(project, page.id, draft);
  // Gone while still being edited (the drawer moved to another page): the rename ends as a blur would end it
  const editing = useRef(false);
  const latest = useRef({ title: page.title, actions });
  latest.current = { title: page.title, actions };
  useEffect(
    () => () => {
      if (editing.current) latest.current.actions.renameLinks(titleAtFocus.current, latest.current.title);
    },
    [],
  );
  return (
    <TextInput
      id={`title-${page.id}`}
      variant="unstyled"
      aria-label="Page title"
      value={draft}
      error={clash ? 'Another page already has this title' : undefined}
      autoFocus={autoFocus}
      onFocus={() => {
        titleAtFocus.current = page.title;
        editing.current = true;
        actions.beginRename(page.id);
      }}
      onBlur={() => {
        editing.current = false;
        if (clash) {
          setDraft(titleAtFocus.current);
          actions.updatePage(page.id, { title: titleAtFocus.current });
          // Back to the title it had: nothing to rewrite, only the rename to end
          actions.renameLinks(titleAtFocus.current, titleAtFocus.current);
          return;
        }
        actions.renameLinks(titleAtFocus.current, page.title);
      }}
      onChange={(e) => {
        const title = e.currentTarget.value;
        setDraft(title);
        if (!titleTaken(project, page.id, title)) actions.updatePage(page.id, { title });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter?.();
        }
      }}
      placeholder="Untitled page"
      classNames={{ input: classes.titleInput }}
      style={{ '--title-size': `${size}px` } as CSSProperties}
    />
  );
}
