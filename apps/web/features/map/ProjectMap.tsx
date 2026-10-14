'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Box, Center, Group, Kbd, SegmentedControl, Stack, TextInput, ThemeIcon, Title, Tooltip, UnstyledButton } from '@mantine/core';
import { useHotkeys, useMediaQuery, useWindowEvent } from '@mantine/hooks';
import { IconLayoutList, IconSearch, IconSitemap } from '@tabler/icons-react';
import type { Project } from '@wisepath/domain/projects';
import { displayTitle, lookOf, mapTree, nextPage, pagesInMapOrder, projectProgress } from '@wisepath/domain/projects';
import { ProjectGate } from '@/features/projects/ProjectGate';
import { SaveStatus } from '@/features/projects/SaveStatus';
import type { ProjectActions, SaveState } from '@/useCases/projects';
import { AppFrame } from '@/features/shell/AppFrame';
import { PageGlyph } from '@/features/shared/look';
import { DRAWER_GAP, DRAWER_WIDTH } from '@/features/page/PageDrawer';
import { openPageId, pageHref } from '@/features/shared/routes';
import { OPEN_SEARCH_EVENT } from '@/features/editor/extensions';
import { MindMap } from './MindMap';
import type { FocusRequest } from './MindMap';
import { MapList } from './MapList';
import { MapOrphans } from './MapOrphans';
import { ContinueButton } from './ContinueButton';
import { MapSearchResults, SEARCH_RESULTS_ID } from './MapSearchResults';
import { MapSearchPage } from './MapSearchPage';
import classes from './ProjectMap.module.css';

/**
 * ProjectMap
 * A map's home: its title and progress, and the mind map (or the list) across
 * the full width. Selecting a page navigates to its URL, which opens it in a
 * drawer over the map (see app/projects/[projectId]/@drawer); the open page
 * is read back from the URL.
 */

type View = 'map' | 'list';

export function ProjectMap({ projectId }: { projectId: string }) {
  return <ProjectGate projectId={projectId}>{(project, actions, save) => <MapView project={project} store={actions} save={save} />}</ProjectGate>;
}

function MapView({ project, store, save }: { project: Project; store: ProjectActions; save: SaveState }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // A phone opens the outline: the drawing needs room to read; the map renders only in the browser, so the width is known
  const [view, setView] = useState<View>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches ? 'list' : 'map',
  );
  // Keyboard hints only where there is a keyboard
  const hasKeyboard = useMediaQuery('(hover: hover) and (pointer: fine)', true);
  const [query, setQuery] = useState('');
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const selectedId = openPageId(pathname, project.id);
  const next = nextPage(project);
  const { studied, total } = projectProgress(project);
  const look = lookOf(project, project.rootPageId);

  // Opening the drawer adds a history entry (back closes it); moving between pages replaces it
  const select = useCallback(
    (pageId: string) => {
      const href = pageHref(project.id, pageId);
      if (selectedId) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router, project.id, selectedId],
  );

  // Whatever opened the page (a click, search, the drawer's related pages), bring it into view
  useEffect(() => {
    if (selectedId)
      setFocusRequest((r) => ({
        pageId: selectedId,
        nonce: (r?.nonce ?? 0) + 1,
      }));
  }, [selectedId]);

  // ?open=<page> from a link outside the map: drop it from this entry, then open the drawer
  // (&new=1, for a page just made, carries over: the drawer puts the cursor in its text)
  const toOpen = searchParams.get('open');
  const isNew = searchParams.get('new') === '1';
  useEffect(() => {
    if (!toOpen) return;
    window.history.replaceState(null, '', pathname);
    router.push(`${pageHref(project.id, toOpen)}${isNew ? '?new=1' : ''}`, {
      scroll: false,
    });
  }, [toOpen, isNew, pathname, project.id, router]);

  const matchIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set<string>(project.pages.filter((p) => displayTitle(p).toLowerCase().includes(q)).map((p) => p.id));
  }, [project.pages, query]);
  // What it finds, in the map's reading order, then the pages off the map
  const results = useMemo(
    () => (matchIds ? [...pagesInMapOrder(project), ...mapTree(project).orphans].filter((p) => matchIds.has(p.id)) : []),
    [project, matchIds],
  );
  // The result the arrow keys mark, opened by Enter; back to the first as the search changes
  const [active, setActive] = useState(0);
  // A result opened in the search's panel, in place of the list, as a map app opens a place; typing goes back to the list
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = detailId ? project.pages.find((p) => p.id === detailId) : undefined;
  useEffect(() => {
    setActive(0);
    setDetailId(null);
  }, [query]);
  const focusOn = (pageId: string) => setFocusRequest((r) => ({ pageId, nonce: (r?.nonce ?? 0) + 1 }));
  const showDetail = (pageId: string) => {
    setDetailId(pageId);
    focusOn(pageId);
  };

  // The search stays folded until it is wanted: a click or ⌘K (Ctrl K) opens it
  const [searchOpen, setSearchOpen] = useState(false);
  // The map renders only on the client (it loads in the browser), so the platform is known here
  const shortcut = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K';
  // Focused once rendered: opened from the page's text, the field may not exist yet on the next frame
  const [searchFocus, setSearchFocus] = useState(0);
  const openSearch = () => {
    setSearchOpen(true);
    setSearchFocus((n) => n + 1);
  };
  useEffect(() => {
    if (searchFocus) searchRef.current?.focus();
  }, [searchFocus]);
  // ⌘K works from fields too; in the page's text it comes as an event (with text selected there, it makes a link)
  useHotkeys([['mod+K', openSearch]], []);
  useWindowEvent(OPEN_SEARCH_EVENT, openSearch);

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      // Esc empties it, then closes it; the drawer, if open, is left alone
      event.stopPropagation();
      if (detailId) {
        // A search field empties itself on Esc; here Esc only goes back to the list
        event.preventDefault();
        setDetailId(null);
      }
      else if (query) setQuery('');
      else {
        setSearchOpen(false);
        searchRef.current?.blur();
      }
    }
    if (results.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const to = (active + step + results.length) % results.length;
      setActive(to);
      // Brings the page it marks into view on the map; with a result open, the next one opens in its place
      if (detailId) setDetailId(results[to].id);
      focusOn(results[to].id);
      document.getElementById(`${SEARCH_RESULTS_ID}-${to}`)?.scrollIntoView({ block: 'nearest' });
    }
    if (event.key === 'Enter' && !detailId) showDetail(results[Math.min(active, results.length - 1)].id);
  };

  // The search's panel reaches down toward the map's bottom edge, and the map keeps what it shows clear of it
  const [panelMax, setPanelMax] = useState(520);
  const [panelRight, setPanelRight] = useState(0);
  const measurePanel = useCallback(() => {
    const wrap = searchWrapRef.current?.getBoundingClientRect();
    const canvas = canvasRef.current?.getBoundingClientRect();
    if (!wrap || !canvas) return;
    // Stops above the zoom controls in the map's bottom corner
    setPanelMax(Math.max(240, canvas.bottom - wrap.bottom - 70));
    setPanelRight(wrap.right - canvas.left);
  }, []);
  useLayoutEffect(measurePanel, [measurePanel, searchOpen, matchIds !== null, view]);
  useWindowEvent('resize', measurePanel);

  const search = searchOpen ? (
    // The results hang from the field, lined up with its left edge
    <div
      ref={searchWrapRef}
      className={classes.searchWrap}
      data-expanded={(view === 'map' && !!matchIds) || undefined}
      style={{ '--panel-max': `${panelMax}px` } as CSSProperties}
    >
      <TextInput
        ref={searchRef}
        onBlur={() => !query && setSearchOpen(false)}
        type="search"
        aria-label="Search this path"
        placeholder="Search pages…"
        leftSection={<IconSearch size={16} />}
        rightSection={hasKeyboard ? <Kbd size="xs">{shortcut}</Kbd> : undefined}
        rightSectionWidth={hasKeyboard ? (shortcut === '⌘K' ? 44 : 58) : undefined}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        onKeyDown={onSearchKeyDown}
        role="combobox"
        aria-expanded={!!matchIds}
        aria-controls={SEARCH_RESULTS_ID}
        aria-activedescendant={matchIds && results.length > 0 ? `${SEARCH_RESULTS_ID}-${active}` : undefined}
        className={classes.search}
        radius="md"
      />
      {/* On the map, what the search finds is also a list to open from; the list view is that list already */}
      {view === 'map' && matchIds && detail && (
        <MapSearchPage
          className={classes.results}
          project={project}
          page={detail}
          store={store}
          resultCount={results.length}
          onBack={() => {
            setDetailId(null);
            searchRef.current?.focus();
          }}
          onSelect={showDetail}
          onOpenInDrawer={() => {
            select(detail.id);
            setQuery('');
            setSearchOpen(false);
          }}
        />
      )}
      {view === 'map' && matchIds && !detail && (
        <MapSearchResults
          className={classes.results}
          project={project}
          query={query}
          results={results}
          active={active}
          selectedId={selectedId}
          currentId={next?.id ?? null}
          onActive={setActive}
          onSelect={(pageId) => {
            setActive(results.findIndex((p) => p.id === pageId));
            showDetail(pageId);
          }}
        />
      )}
    </div>
  ) : (
    <UnstyledButton onClick={openSearch} aria-label="Search this path" className={classes.searchButton}>
      <IconSearch size={16} />
      {hasKeyboard && <Kbd size="xs">{shortcut}</Kbd>}
    </UnstyledButton>
  );

  // What the canvas shows: the map or the list
  const viewSwitch = (
    <SegmentedControl
      size="sm"
      value={view}
      onChange={(v) => setView(v as View)}
      aria-label="View"
      className={classes.viewSwitch}
      data={[
        {
          value: 'map',
          label: (
            <Center style={{ gap: 6 }}>
              <IconSitemap size={14} />
              <span>Map</span>
            </Center>
          ),
        },
        {
          value: 'list',
          label: (
            <Center style={{ gap: 6 }}>
              <IconLayoutList size={14} />
              <span>List</span>
            </Center>
          ),
        },
      ]}
    />
  );

  // Top left of the canvas: what it shows and the search, then pages left off the map
  const canvasTools = (
    <Stack gap={6} align="flex-start">
      <Group gap="xs" wrap="nowrap" w="100%">
        {viewSwitch}
        {search}
      </Group>
      <MapOrphans project={project} selectedId={selectedId} onSelect={select} />
    </Stack>
  );

  // Title and the way on, in one row of the top bar
  const header = (
    <Group gap="md" wrap="nowrap" miw={0} style={{ flex: 1 }}>
      <Group gap="sm" wrap="nowrap" miw={0} style={{ flex: 1 }}>
        <ThemeIcon size={36} radius="xl" variant="light" color={look.color} style={{ flexShrink: 0 }}>
          <PageGlyph icon={look.icon} size={20} />
        </ThemeIcon>
        <Tooltip label={project.description} disabled={!project.description} multiline w={320} position="bottom-start" withArrow>
          <Title order={1} fz={20} lts={-0.3} lh={1.2} lineClamp={1}>
            {project.title}
          </Title>
        </Tooltip>
        {/* Only while something is on its way, or was undone */}
        <Box visibleFrom="sm" style={{ flexShrink: 0 }}>
          <SaveStatus save={save} hideSaved />
        </Box>
      </Group>
      {/* Progress and the way on, as one control */}
      <Box visibleFrom="sm">
        <ContinueButton next={next} studied={studied} total={total} onContinue={() => next && select(next.id)} />
      </Box>
      <Box hiddenFrom="sm">
        <ContinueButton next={next} studied={studied} total={total} onContinue={() => next && select(next.id)} compact />
      </Box>
    </Group>
  );

  return (
    <AppFrame header={header}>
      <div className={classes.page}>
        <div className={classes.canvas} ref={canvasRef}>
          {view === 'map' ? (
            <MindMap
              project={project}
              selectedId={selectedId}
              coveredRight={selectedId ? DRAWER_WIDTH + DRAWER_GAP * 2 : 0}
              currentId={next?.id ?? null}
              matchIds={matchIds}
              searchActiveId={detailId ?? (searchOpen && results.length > 0 ? results[Math.min(active, results.length - 1)].id : null)}
              coveredLeft={view === 'map' && matchIds ? panelRight : 0}
              focusRequest={focusRequest}
              onSelect={(pageId) => select(pageId)}
              onIntent={(pageId) => router.prefetch(pageHref(project.id, pageId))}
              topLeft={canvasTools}
            />
          ) : (
            <MapList
              header={canvasTools}
              project={project}
              selectedId={selectedId}
              currentId={next?.id ?? null}
              matchIds={matchIds}
              onSelect={(pageId) => select(pageId)}
            />
          )}
        </div>
      </div>
    </AppFrame>
  );
}
