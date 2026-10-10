'use client';

import Link from 'next/link';
import type { Page, Project } from '../types/project.types';
import { displayTitle, wordCount } from '../entities/project.entity';
import { ConnectionsEditor } from './ConnectionsEditor';
import { Markdown } from './Markdown';
import { StudiedToggle } from './StudiedToggle';

/**
 * SelectionPanel
 * The page selected on the map: a preview of its markdown, its connections,
 * and the way into the full-screen editor.
 */

interface SelectionPanelProps {
  project: Project;
  page: Page | null;
  pageHref: (pageId: string) => string;
  onSelect: (pageId: string) => void;
  onCreatePage: () => void;
  onSetStudied: (pageId: string, studied: boolean) => void;
  onConnect: (pageA: string, pageB: string) => void;
  onDisconnect: (pageA: string, pageB: string) => void;
}

const dateFormat = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });

export function SelectionPanel({
  project,
  page,
  pageHref,
  onSelect,
  onCreatePage,
  onSetStudied,
  onConnect,
  onDisconnect,
}: SelectionPanelProps) {
  if (!page) {
    const empty = project.pages.length === 0;
    return (
      <aside aria-label="Selected page" className="flex flex-col gap-3 px-6 py-6 lg:px-7">
        <h2 className="font-star text-[28px] italic leading-tight">{empty ? 'Start your project' : 'No page selected'}</h2>
        <p className="max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
          {empty
            ? `Add the first page of ${project.title}, then write it in markdown.`
            : 'Select a star to preview its page and connections. Double-click a star to open it, or double-click empty sky to add a page.'}
        </p>
        {empty && (
          <button
            type="button"
            onClick={onCreatePage}
            className="mt-2 h-10 w-fit rounded bg-finder px-4 text-[15px] font-bold text-finder-foreground hover:bg-finder/90"
          >
            New page
          </button>
        )}
      </aside>
    );
  }

  const words = wordCount(page.content);

  return (
    <aside aria-label="Selected page" className="flex min-h-0 flex-col gap-5 overflow-y-auto px-6 py-6 lg:px-7">
      <header className="space-y-2">
        <h2 className="font-star text-[28px] font-medium italic leading-tight">{displayTitle(page)}</h2>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {words} {words === 1 ? 'word' : 'words'}. Edited {dateFormat.format(new Date(page.updatedAt))}
          </span>
          <StudiedToggle studied={page.studied} onChange={(studied) => onSetStudied(page.id, studied)} />
        </div>
      </header>

      {page.content.trim() ? (
        <div className="relative max-h-72 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
          <Markdown content={page.content} />
        </div>
      ) : (
        <p className="text-[15px] text-muted-foreground">Nothing written yet. Open the page to start writing.</p>
      )}

      <ConnectionsEditor
        project={project}
        pageId={page.id}
        onOpenPage={onSelect}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />

      <div className="mt-auto pt-2">
        <Link
          href={pageHref(page.id)}
          className="flex h-11 w-full items-center justify-center rounded bg-finder text-[15px] font-bold text-finder-foreground transition-colors hover:bg-finder/90 focus-visible:outline-finder active:bg-finder/80"
        >
          Open page
        </Link>
      </div>
    </aside>
  );
}
