'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import type { Page, Project } from '../types/project.types';
import { PageContent } from './PageContent';
import type { PageActions } from './PageContent';
import { StudiedToggle } from './StudiedToggle';
import { CloseIcon, ExpandIcon } from './icons';

/**
 * PageSheet
 * The open page beside the map, editable in place. Esc closes it.
 */

interface PageSheetProps {
  project: Project;
  page: Page;
  actions: PageActions;
  isFresh: boolean;
  fullPageHref: string;
  onClose: () => void;
}

export function PageSheet({ project, page, actions, isFresh, fullPageHref, onClose }: PageSheetProps) {
  // Esc closes the sheet unless a field is being edited (fields handle Esc themselves)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        active.blur();
        return;
      }
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <aside
      aria-label="Page"
      className="fixed inset-0 z-30 flex flex-col bg-card lg:static lg:z-auto lg:min-h-0 lg:border-l lg:border-border"
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4 sm:px-6">
        <StudiedToggle studied={page.studied} onChange={(studied) => actions.updatePage(page.id, { studied })} />
        <div className="flex items-center gap-1">
          <Link
            href={fullPageHref}
            aria-label="Open full screen"
            title="Open full screen"
            className="grid h-8 w-8 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ExpandIcon />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close page"
            title="Close (Esc)"
            className="grid h-8 w-8 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-10 pt-6 sm:px-7">
        <PageContent key={page.id} project={project} page={page} actions={actions} isFresh={isFresh} />
      </div>
    </aside>
  );
}
