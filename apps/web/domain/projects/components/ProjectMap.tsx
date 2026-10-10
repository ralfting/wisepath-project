'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Project } from '../types/project.types';
import { pagesInOrder } from '../entities/project.entity';
import { useProjectProgress } from '../hooks/useProjectProgress';
import { StarChart } from './StarChart';
import type { FocusRequest } from './StarChart';
import { PageList } from './PageList';
import { PagePanel } from './PagePanel';
import { SearchIcon } from './icons';

/**
 * ProjectView
 * Project shell: top bar with Map/List tabs, page search and progress,
 * the chart or list on the left and the page panel on the right.
 */

type Tab = 'map' | 'list';
const TABS: { id: Tab; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'list', label: 'List' },
];

export function ProjectView({ project: initialProject }: { project: Project }) {
  const { project, nextPage, studiedCount, markStudied } = useProjectProgress(initialProject);
  const [tab, setTab] = useState<Tab>('map');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ map: null, list: null });

  const total = project.pages.length;
  const panelPage = project.pages.find((p) => p.id === selectedId) ?? nextPage;

  const matchIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set(project.pages.filter((p) => p.title.toLowerCase().includes(q)).map((p) => p.id));
  }, [project.pages, query]);

  const selectAndFocus = (pageId: string) => {
    setSelectedId(pageId);
    setFocusRequest((r) => ({ pageId, nonce: (r?.nonce ?? 0) + 1 }));
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') setQuery('');
    if (event.key !== 'Enter' || !matchIds || matchIds.size === 0) return;
    const first = pagesInOrder(project).find((p) => matchIds.has(p.id));
    if (first) selectAndFocus(first.id);
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const next: Tab = tab === 'map' ? 'list' : 'map';
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const onMarkStudied = (pageId: string, studied: boolean) => {
    // Keep the panel on the page just changed instead of jumping to the new next page
    setSelectedId(pageId);
    markStudied(pageId, studied);
  };

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border bg-card px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="text-[17px] font-bold">
          WisePath
        </Link>
        <nav aria-label="Breadcrumb" className="text-[15px] text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground hover:underline">
            Projects
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="font-bold text-foreground" aria-current="page">
            {project.title}
          </span>
        </nav>

        <div role="tablist" aria-label="View" className="flex gap-1 rounded-md bg-muted p-[3px] ring-1 ring-border">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={onTabKeyDown}
              className="rounded px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground aria-selected:bg-card aria-selected:font-bold aria-selected:text-foreground aria-selected:shadow-[0_1px_2px_hsl(var(--primary)/0.12)]"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="relative block">
            <span className="sr-only">Search pages</span>
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search pages"
              className="h-9 w-60 rounded border border-input bg-card pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-ring"
            />
          </label>

          {total > 0 && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                <span className="font-bold text-foreground">{studiedCount}</span> of {total} studied
              </span>
              <div
                role="progressbar"
                aria-label="Pages studied"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={studiedCount}
                className="h-1.5 w-32 overflow-hidden rounded-full bg-border"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${(studiedCount / total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className="h-[64vh] min-h-0 p-3 sm:p-4 lg:h-auto lg:pr-0"
        >
          {tab === 'map' ? (
            <StarChart
              project={project}
              nextPageId={nextPage?.id ?? null}
              selectedId={selectedId}
              matchIds={matchIds}
              focusRequest={focusRequest}
              onSelect={setSelectedId}
            />
          ) : (
            <PageList
              project={project}
              nextPageId={nextPage?.id ?? null}
              selectedId={panelPage?.id ?? null}
              matchIds={matchIds}
              onSelect={setSelectedId}
            />
          )}
        </div>

        <PagePanel
          project={project}
          page={panelPage}
          nextPage={nextPage}
          studiedCount={studiedCount}
          onSelect={selectAndFocus}
          onMarkStudied={onMarkStudied}
        />
      </main>
    </div>
  );
}
