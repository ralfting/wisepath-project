'use client';

import { useState } from 'react';
import type { Page, Project } from '../types/project.types';
import { displayTitle } from '../entities/project.entity';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { ConnectionsEditor } from './ConnectionsEditor';
import { PlusIcon, TrashIcon } from './icons';

/**
 * PageContent
 * One page, editable in place: title, markdown blocks, connections,
 * a shortcut to a new connected page, and delete.
 * Used by the map's side sheet and by the full-screen page.
 */

export interface PageActions {
  updatePage: (pageId: string, patch: Partial<Pick<Page, 'title' | 'content' | 'studied'>>) => void;
  connect: (pageA: string, pageB: string) => void;
  disconnect: (pageA: string, pageB: string) => void;
  openPage: (pageId: string) => void;
  createConnectedPage: (fromPageId: string) => void;
  /** Creates a page with this title next to `fromPageId`, connects and opens it */
  createNamedPage: (title: string, fromPageId: string) => void;
  deletePage: (pageId: string) => void;
}

interface PageContentProps {
  project: Project;
  page: Page;
  actions: PageActions;
  /** Focus the title on mount, for a page just created */
  isFresh?: boolean;
  titleClassName?: string;
}

export function PageContent({ project, page, actions, isFresh = false, titleClassName = 'text-[32px]' }: PageContentProps) {
  const [focusSignal, setFocusSignal] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <label htmlFor={`title-${page.id}`} className="sr-only">
          Page title
        </label>
        <input
          id={`title-${page.id}`}
          value={page.title}
          autoFocus={isFresh}
          onChange={(e) => actions.updatePage(page.id, { title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              setFocusSignal((n) => n + 1);
            }
          }}
          placeholder="Untitled page"
          className={`w-full bg-transparent font-star font-medium italic leading-tight outline-none placeholder:text-muted-foreground/60 focus-visible:outline-none ${titleClassName}`}
        />
        <MarkdownEditor
          key={page.id}
          content={page.content}
          onChange={(content) => actions.updatePage(page.id, { content })}
          pages={project.pages}
          currentPageId={page.id}
          onOpenPage={actions.openPage}
          onLinkPage={(linkedId) => actions.connect(page.id, linkedId)}
          onCreatePage={(title) => actions.createNamedPage(title, page.id)}
          focusSignal={focusSignal}
        />
      </div>

      <div className="space-y-3 border-t border-border pt-6">
        <ConnectionsEditor
          project={project}
          pageId={page.id}
          onOpenPage={actions.openPage}
          onConnect={actions.connect}
          onDisconnect={actions.disconnect}
        />
        <button
          type="button"
          onClick={() => actions.createConnectedPage(page.id)}
          className="inline-flex h-9 items-center gap-1.5 rounded border border-border bg-card px-3 text-sm font-bold text-foreground transition-colors hover:bg-accent"
        >
          <PlusIcon />
          New connected page
        </button>
      </div>

      <div className="border-t border-border pt-5">
        {confirmDelete ? (
          <div className="space-y-3">
            <p className="text-sm">
              Delete <span className="font-star italic">{displayTitle(page)}</span> and its connections? This can&apos;t be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => actions.deletePage(page.id)}
                className="h-9 rounded bg-destructive px-3.5 text-sm font-bold text-destructive-foreground hover:bg-destructive/90"
              >
                Delete page
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-9 rounded px-3.5 text-sm text-foreground hover:bg-accent"
              >
                Keep it
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 rounded py-1 text-sm text-muted-foreground hover:text-destructive"
          >
            <TrashIcon />
            Delete page
          </button>
        )}
      </div>
    </div>
  );
}
