'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { countStudied, displayTitle, pagesInOrder } from '../entities/project.entity';
import { useProjectStore } from '../hooks/useProjectStore';
import { StarChart } from './StarChart';
import type { FocusRequest } from './StarChart';
import { PageList } from './PageList';
import { PageSheet } from './PageSheet';
import type { PageActions } from './PageContent';
import { PlusIcon, SearchIcon } from './icons';

/**
 * ProjectMap
 * Project shell: top bar with Map/List tabs, page search, New page and progress.
 * Clicking a page opens it beside the map, editable in place.
 */

type Tab = 'map' | 'list';
const TABS: { id: Tab; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'list', label: 'List' },
];

export function ProjectMap() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const store = useProjectStore();
  const { project } = store;

  const initialPage = searchParams.get('page');
  const [tab, setTab] = useState<Tab>('map');
  const [openId, setOpenId] = useState<string | null>(initialPage);
  const [composeRequest, setComposeRequest] = useState<{ parentId: string | null; nonce: number } | null>(null);
  const [query, setQuery] = useState('');
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(
    initialPage ? { pageId: initialPage, nonce: 1, mode: 'center' } : null,
  );
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ map: null, list: null });

  const total = project.pages.length;
  const studied = countStudied(project);
  const openPage = project.pages.find((p) => p.id === openId) ?? null;
  const fullPageHref = (pageId: string) => `/projects/${project.id}/pages/${pageId}`;

  // Keep ?page= in the URL so reload and back return to the open page
  const syncUrl = useCallback(
    (pageId: string | null) => {
      router.replace(pageId ? `${pathname}?page=${pageId}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const open = useCallback(
    (pageId: string | null, focus: FocusRequest['mode'] | null = 'reveal') => {
      setOpenId(pageId);
      syncUrl(pageId);
      if (pageId && focus) setFocusRequest((r) => ({ pageId, nonce: (r?.nonce ?? 0) + 1, mode: focus }));
    },
    [syncUrl],
  );

  /** Opens the name field under the open page, or under the start page, or for the first page */
  const startAdding = () => {
    setTab('map');
    const parentId = openId ?? project.startPageId ?? null;
    if (parentId && parentId !== openId) open(parentId);
    setComposeRequest((r) => ({ parentId, nonce: (r?.nonce ?? 0) + 1 }));
  };

  const actions: PageActions = {
    updatePage: store.updatePage,
    renameLinks: store.renameLinks,
    openPage: (pageId) => open(pageId),
    addChild: (parentId, title) => {
      store.addChild(parentId, title);
    },
    createLinkedPage: (title) => open(store.addPage(title).id),
    deletePage: (pageId) => {
      store.deletePage(pageId);
      open(null, null);
    },
  };

  const matchIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set(project.pages.filter((p) => displayTitle(p).toLowerCase().includes(q)).map((p) => p.id));
  }, [project.pages, query]);

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') setQuery('');
    if (event.key !== 'Enter' || !matchIds || matchIds.size === 0) return;
    const first = pagesInOrder(project).find((p) => matchIds.has(p.id));
    if (first) open(first.id, 'center');
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
          <Link href="/projects" className="text-[17px] font-bold">
            WisePath
          </Link>
          <nav aria-label="Breadcrumb" className="min-w-0 truncate text-[15px] text-muted-foreground">
            <Link href="/projects" className="hover:text-foreground hover:underline">
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
            onClick={startAdding}
            className="inline-flex h-9 items-center gap-1.5 rounded bg-finder px-3.5 text-sm font-bold text-finder-foreground transition-colors hover:bg-finder/90 focus-visible:outline-finder"
          >
            <PlusIcon />
            Add page
          </button>
        </div>
      </header>

      <main
        className={`grid min-h-0 flex-1 grid-cols-1 ${openPage ? 'lg:grid-cols-[minmax(0,1fr)_560px]' : ''}`}
      >
        <div
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className={`h-[calc(100vh-150px)] min-h-0 p-3 sm:p-4 lg:h-auto ${openPage ? 'lg:pr-4' : ''}`}
        >
          {tab === 'map' ? (
            <StarChart
              project={project}
              selectedId={openId}
              matchIds={matchIds}
              focusRequest={focusRequest}
              onSelect={(pageId) => open(pageId, null)}
              onAddChild={(parentId, title) => store.addChild(parentId, title).id}
              composeRequest={composeRequest}
              onResetSample={() => {
                store.reset();
                open(null, null);
              }}
            />
          ) : (
            <PageList project={project} selectedId={openId} matchIds={matchIds} onOpen={(pageId) => open(pageId, null)} />
          )}
        </div>

        {openPage && store.ready && (
          <PageSheet
            project={project}
            page={openPage}
            actions={actions}
            isFresh={false}
            isStart={openPage.id === project.startPageId}
            onToggleStart={() => store.setStartPage(openPage.id === project.startPageId ? null : openPage.id)}
            fullPageHref={fullPageHref(openPage.id)}
            onClose={() => open(null, null)}
          />
        )}
      </main>
    </div>
  );
}
