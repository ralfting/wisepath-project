'use client';

import { useMemo, useRef, useState } from 'react';
import type { Page, Project } from '../types/project.types';
import { displayTitle } from '../entities/project.entity';
import { references } from '../entities/levels';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { PlusIcon, TrashIcon } from './icons';

/**
 * PageContent
 * One page, editable in place: title, markdown, the pages it leads to and
 * comes from (both read from its [[links]]), adding a page below, and delete.
 * Used by the map's side sheet and by the full-screen page.
 */

export interface PageActions {
  updatePage: (pageId: string, patch: Partial<Pick<Page, 'title' | 'content' | 'studied'>>) => void;
  /** Rewrites [[Old]] links across the project after a rename */
  renameLinks: (oldTitle: string, newTitle: string) => void;
  openPage: (pageId: string) => void;
  /** Adds a page one level below `parentId` by writing its [[link]] there */
  addChild: (parentId: string, title: string) => void;
  /** Creates the page a [[link]] already points to, and opens it */
  createLinkedPage: (title: string) => void;
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
  const [childDraft, setChildDraft] = useState<string | null>(null);
  const titleAtFocus = useRef(page.title);

  const { leadsTo, comesFrom } = useMemo(() => {
    const refs = references(project);
    const byId = new Map(project.pages.map((p) => [p.id, p]));
    const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((p): p is Page => !!p);
    return {
      leadsTo: pick(refs.filter((r) => r.from === page.id).map((r) => r.to)),
      comesFrom: pick(refs.filter((r) => r.to === page.id).map((r) => r.from)),
    };
  }, [project, page.id]);

  const addChild = () => {
    const title = (childDraft ?? '').trim();
    if (title) actions.addChild(page.id, title);
    setChildDraft('');
  };

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
          onFocus={() => {
            titleAtFocus.current = page.title;
          }}
          // Links to this page follow the new name once editing the title ends
          onBlur={() => actions.renameLinks(titleAtFocus.current, page.title)}
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
          onLinkPage={() => {}}
          onCreatePage={actions.createLinkedPage}
          focusSignal={focusSignal}
        />
      </div>

      <section className="space-y-3 border-t border-border pt-6" aria-labelledby={`next-${page.id}`}>
        <h3 id={`next-${page.id}`} className="text-[15px] font-bold">
          Leads to <span className="font-normal text-muted-foreground">({leadsTo.length})</span>
        </h3>
        {leadsTo.length > 0 && <PageLinks pages={leadsTo} onOpen={actions.openPage} />}

        {childDraft !== null ? (
          <div className="space-y-1.5">
            <label htmlFor={`child-${page.id}`} className="sr-only">
              Name of the page below
            </label>
            <input
              id={`child-${page.id}`}
              autoFocus
              value={childDraft}
              onChange={(e) => setChildDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addChild();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setChildDraft(null);
                }
              }}
              onBlur={() => {
                if (childDraft.trim()) actions.addChild(page.id, childDraft.trim());
                setChildDraft(null);
              }}
              placeholder="Name the next page"
              className="h-9 w-full rounded border border-input bg-card px-3 font-star text-[15px] italic placeholder:font-sans placeholder:text-sm placeholder:not-italic placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">Enter adds it and keeps the field open for the next one. Esc closes.</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setChildDraft('')}
            className="inline-flex h-9 items-center gap-1.5 rounded border border-border bg-card px-3 text-sm font-bold text-foreground transition-colors hover:bg-accent"
          >
            <PlusIcon />
            Add a page below
          </button>
        )}

        {comesFrom.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <h3 className="text-[15px] font-bold">
              Comes from <span className="font-normal text-muted-foreground">({comesFrom.length})</span>
            </h3>
            <PageLinks pages={comesFrom} onOpen={actions.openPage} />
          </div>
        )}
        <p className="text-xs text-muted-foreground">To link a page that already exists, type [[ in the text.</p>
      </section>

      <div className="border-t border-border pt-5">
        {confirmDelete ? (
          <div className="space-y-3">
            <p className="text-sm">
              Delete <span className="font-star italic">{displayTitle(page)}</span>? Links to it stay in other pages and
              show as missing. This can&apos;t be undone.
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

function PageLinks({ pages, onOpen }: { pages: Page[]; onOpen: (pageId: string) => void }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {pages.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onOpen(p.id)}
            className="block w-full truncate py-1.5 text-left font-star text-[15px] italic hover:underline hover:underline-offset-4"
          >
            {displayTitle(p)}
          </button>
        </li>
      ))}
    </ul>
  );
}
