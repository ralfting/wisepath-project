'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ChartPosition } from '../types/project.types';
import { countStudied, displayTitle, nextFreePosition, pagesInOrder } from '../entities/project.entity';
import { useProjectStore } from '../hooks/useProjectStore';
import { COLUMN, StarChart } from './StarChart';
import type { FocusRequest } from './StarChart';
import { PageList } from './PageList';
import { SelectionPanel } from './SelectionPanel';
import { PlusIcon, SearchIcon } from './icons';

/**
 * ProjectMap
 * Project shell: top bar with Map/List tabs, page search, New page and progress;
 * the chart or list on the left and the selected page on the right.
 */

type Tab = 'map' | 'list';
const TABS: { id: Tab; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'list', label: 'List' },
];

export function ProjectMap() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useProjectStore();
  const { project } = store;

  // Returning from a page keeps it selected and in view
  const returnedTo = searchParams.get('page');
  const [tab, setTab] = useState<Tab>('map');
  const [selectedId, setSelectedId] = useState<string | null>(returnedTo);
  const [query, setQuery] = useState('');
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(
    returnedTo ? { pageId: returnedTo, nonce: 1 } : null,
  );
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ map: null, list: null });

  const total = project.pages.length;
  const studied = countStudied(project);
  const selectedPage = project.pages.find((p) => p.id === selectedId) ?? null;
  const pageHref = (pageId: string) => `/projects/${project.id}/pages/${pageId}`;

  const matchIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set(project.pages.filter((p) => displayTitle(p).toLowerCase().includes(q)).map((p) => p.id));
  }, [project.pages, query]);

  const selectAndFocus = (pageId: string) => {
    setSelectedId(pageId);
    setFocusRequest((r) => ({ pageId, nonce: (r?.nonce ?? 0) + 1 }));
  };

  const createPageAt = (position: ChartPosition) => {
    const page = store.createPage(position);
    router.push(`${pageHref(page.id)}?new=1`);
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

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <header className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 border-b border-border bg-card px-4 py-3 sm:px-6 lg:flex lg:h-14 lg:py-0">
        <div className="flex min-w-0 items-center gap-x-5">
          <Link href="/dashboard" className="text-[17px] font-bold">
            WisePath
          </Link>
          <nav aria-label="Breadcrumb" className="min-w-0 truncate text-[15px] text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground hover:underline">
              Projects
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="font-bold text-foreground" aria-current="page">
              {project.title}
            </span>
          </nav>
        </div>

        <div role="tablist" aria-label="View" className="flex w-fit gap-1 rounded-md bg-muted p-[3px] ring-1 ring-border">
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
              className="rounded px-3.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground aria-selected:bg-card aria-selected:font-bold aria-selected:text-foreground aria-selected:shadow-[0_1px_2px_hsl(var(--primary)/0.12)]"
            >
              {label}
            </button>
          ))}
        </div>

        <label className="relative col-span-2 block lg:ml-auto lg:w-60">
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
            className="h-9 w-full rounded border border-input bg-card pl-8 pr-3 text-sm placeholder:text-muted-foreground"
          />
        </label>

        <div className="col-span-2 flex items-center justify-between gap-5 lg:justify-end">
          {total > 0 && (
            <span className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{studied}</span> of {total} studied
            </span>
          )}
          <button
            type="button"
            onClick={() => createPageAt(nextFreePosition(project, COLUMN))}
            className="inline-flex h-9 items-center gap-1.5 rounded bg-finder px-3.5 text-sm font-bold text-finder-foreground transition-colors hover:bg-finder/90 focus-visible:outline-finder"
          >
            <PlusIcon />
            New page
          </button>
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
              selectedId={selectedId}
              matchIds={matchIds}
              focusRequest={focusRequest}
              onSelect={setSelectedId}
              onOpen={(pageId) => router.push(pageHref(pageId))}
              onCreateAt={createPageAt}
              onMove={store.movePage}
              onConnect={store.connect}
            />
          ) : (
            <PageList project={project} selectedId={selectedId} matchIds={matchIds} pageHref={pageHref} />
          )}
        </div>

        <SelectionPanel
          project={project}
          page={selectedPage}
          pageHref={pageHref}
          onSelect={selectAndFocus}
          onCreatePage={() => createPageAt(nextFreePosition(project, COLUMN))}
          onSetStudied={(pageId, value) => store.updatePage(pageId, { studied: value })}
          onConnect={store.connect}
          onDisconnect={store.disconnect}
        />
      </main>
    </div>
  );
}
