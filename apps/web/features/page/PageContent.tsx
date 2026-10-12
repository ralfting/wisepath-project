'use client';

import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Page, Project } from '@wisepath/domain/projects';
import { MarkdownEditor } from '@/features/editor/MarkdownEditor';
import { Stack, TextInput } from '@mantine/core';
import classes from './PageContent.module.css';

/**
 * PageContent
 * One page's title and markdown, edited in place. Used by the map's side
 * panel and by the full-screen page.
 */

export interface PageActions {
  updatePage: (pageId: string, patch: Partial<Pick<Page, 'title' | 'content' | 'studied'>>) => void;
  /** Rewrites [[Old]] links across the project after a rename */
  renameLinks: (oldTitle: string, newTitle: string) => void;
  openPage: (pageId: string) => void;
  /** Creates the page a [[link]] already points to, and opens it */
  createLinkedPage: (title: string) => void;
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
}

export function PageContent({
  project,
  page,
  actions,
  isFresh = false,
  showTitle = true,
  titleSize = 32,
  toolbarOffset = 0,
}: PageContentProps) {
  const [focusSignal, setFocusSignal] = useState(0);

  return (
    <Stack gap="md">
      {showTitle && (
        <PageTitleInput
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
        focusSignal={focusSignal}
        toolbarOffset={toolbarOffset}
      />
    </Stack>
  );
}

/** The page title, edited in place; links to the page follow the new name when editing ends */
export function PageTitleInput({
  page,
  actions,
  autoFocus = false,
  size = 32,
  onEnter,
}: {
  page: Page;
  actions: Pick<PageActions, 'updatePage' | 'renameLinks'>;
  autoFocus?: boolean;
  size?: number;
  onEnter?: () => void;
}) {
  const titleAtFocus = useRef(page.title);
  return (
    <TextInput
      id={`title-${page.id}`}
      variant="unstyled"
      aria-label="Page title"
      value={page.title}
      autoFocus={autoFocus}
      onFocus={() => {
        titleAtFocus.current = page.title;
      }}
      onBlur={() => actions.renameLinks(titleAtFocus.current, page.title)}
      onChange={(e) => actions.updatePage(page.id, { title: e.currentTarget.value })}
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
