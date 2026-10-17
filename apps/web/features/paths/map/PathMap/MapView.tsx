'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ActionIcon, Box, Center, Group, Kbd, Menu, SegmentedControl, Stack, TextInput, ThemeIcon, Title, Tooltip, UnstyledButton } from '@mantine/core';
import { useClickOutside, useHotkeys, useMediaQuery, useWindowEvent } from '@mantine/hooks';
import { IconDots, IconLayoutList, IconSearch, IconSitemap, IconX } from '@tabler/icons-react';
import type { Path } from '@wisepath/domain/paths';
import { lookOf, mapTree, nextPage, pagesInMapOrder, pathProgress } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';
import { SaveStatus } from '@/features/paths/path';
import type { PathActions, SaveState } from '@/useCases/paths';
import { KindSwitchItem } from '@/features/paths/path';
import { AppFrame } from '@/features/shell';
import { useT } from '@/i18n/I18nProvider';
import { PageGlyph } from '@/features/paths/path';
import { DRAWER_GAP, DRAWER_WIDTH } from '@/features/paths/page';
import { openPageId, pageHref, swapOpenPage } from '@/shared/routes';
import { OPEN_SEARCH_EVENT } from '@/features/paths/editor';
import { MindMap } from '../MindMap/MindMap';
import type { FocusRequest } from '../MindMap/MindMap';
import { MapList } from '../MapList/MapList';
import { MapOrphans } from '../MapOrphans/MapOrphans';
import { ContinueButton } from '../ContinueButton/ContinueButton';
import { MapSearchResults, SEARCH_RESULTS_ID } from '../MapSearchResults/MapSearchResults';
import { BranchPrompt } from '../BranchPrompt/BranchPrompt';
import { showToast } from '@/features/inbox/capture';
import classes from './PathMap.module.css';
import type { View } from './PathMap.helpers';

/** A loaded map: its toolbar, search, and mind map or list; selecting a page opens it in the drawer beside it */
export function MapView({ path, actions, save }: { path: Path; actions: PathActions; save: SaveState }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const t = useT();

  // A phone opens the outline: the drawing needs room to read; the map renders only in the browser, so the width is known
  const [view, setView] = useState<View>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches ? 'list' : 'map',
  );
  // Keyboard hints only where there is a keyboard
  const hasKeyboard = useMediaQuery('(hover: hover) and (pointer: fine)', true);
  const [query, setQuery] = useState('');
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const selectedId = openPageId(pathname, path.id);
  // A study has no progress and nothing to continue; a learning path has both
  const progress = path.kind === 'learningPath';
  const next = progress ? nextPage(path) : undefined;
  const { studied, total } = pathProgress(path);
  const look = lookOf(path, path.rootPageId);

  // Opening the drawer adds a history entry (back closes it); moving between pages replaces it
  const select = useCallback(
    (pageId: string, fresh = false) => {
      // A page just made opens with the cursor in its text, ready to write
      const href = `${pageHref(path.id, pageId)}${fresh ? '?new=1' : ''}`;
      // With the drawer open, the page changes in place at once; opening it is a navigation
      if (selectedId) swapOpenPage(href);
      else router.push(href, { scroll: false });
    },
    [router, path.id, selectedId],
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
    router.push(`${pageHref(path.id, toOpen)}${isNew ? '?new=1' : ''}`, {
      scroll: false,
    });
  }, [toOpen, isNew, pathname, path.id, router]);

  const matchIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set<string>(path.pages.filter((p) => displayTitle(p).toLowerCase().includes(q)).map((p) => p.id));
  }, [path.pages, query]);
  // What it finds, in the map's reading order, then the pages off the map
  const results = useMemo(
    () => (matchIds ? [...pagesInMapOrder(path), ...mapTree(path).orphans].filter((p) => matchIds.has(p.id)) : []),
    [path, matchIds],
  );
  // The result the arrow keys mark, opened by Enter; back to the first as the search changes
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [query]);

  // Adding a page branching from another (the + on a page, or N): the name field stays open for the next one
  const [branchFrom, setBranchFrom] = useState<string | null>(null);
  const closeBranch = (refocus: boolean) => {
    const from = branchFrom;
    setBranchFrom(null);
    // Back to the page it was adding to, so the keyboard goes on from there
    if (refocus && from) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-page-id="${from}"]`)?.focus({ preventScroll: true }));
  };
  const addBranch = (parentId: string, title: string, stay: boolean) => {
    const parent = path.pages.find((p) => p.id === parentId);
    const added = actions.addBranch(parentId, title);
    if (!parent || !added) return;
    const names = { title: displayTitle(added.page), parent: displayTitle(parent) };
    showToast({
      text: added.created ? t('map.branch.added', names) : t('map.branch.linked', names),
      action: { label: t('map.branch.undo'), onClick: added.undo },
    });
    if (stay) setFocusRequest((r) => ({ pageId: parentId, nonce: (r?.nonce ?? 0) + 1 }));
    else {
      setBranchFrom(null);
      select(added.page.id, added.created);
    }
  };
  const branchParent = branchFrom ? path.pages.find((p) => p.id === branchFrom) : undefined;
  const branchPrompt = branchParent ? (
    <BranchPrompt
      key={branchParent.id}
      parent={branchParent}
      pages={path.pages}
      onSubmit={(title, stay) => addBranch(branchParent.id, title, stay)}
      onClose={() => closeBranch(true)}
    />
  ) : null;

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
  // A click anywhere else folds it; what it found stays marked, and the folded search shows what it holds
  const searchWrapRef = useClickOutside<HTMLDivElement>(() => setSearchOpen(false));
  // ⌘K works from fields too; in the page's text it comes as an event (with text selected there, it makes a link)
  useHotkeys([['mod+K', openSearch]], []);
  useWindowEvent(OPEN_SEARCH_EVENT, openSearch);

  // A page opened from the search keeps the cursor in it, to go on to the next result: the drawer would take it
  // for the page's text. Only while the page opens; a click anywhere lets go
  const openFromSearch = (pageId: string) => {
    const stop = () => {
      window.removeEventListener('focusin', onFocusIn, true);
      window.removeEventListener('pointerdown', stop, true);
    };
    const onFocusIn = (event: FocusEvent) => {
      if ((event.target as Element).closest?.('.mantine-Drawer-content')) searchRef.current?.focus();
    };
    window.addEventListener('focusin', onFocusIn, true);
    window.addEventListener('pointerdown', stop, true);
    setTimeout(stop, 1500);
    select(pageId);
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      // Esc empties it, then closes it; the drawer, if open, is left alone
      event.stopPropagation();
      if (query) setQuery('');
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
      // Brings the page it marks into view on the map
      setFocusRequest((r) => ({ pageId: results[to].id, nonce: (r?.nonce ?? 0) + 1 }));
      document.getElementById(`${SEARCH_RESULTS_ID}-${to}`)?.scrollIntoView({ block: 'nearest' });
    }
    if (event.key === 'Enter') openFromSearch(results[Math.min(active, results.length - 1)].id);
  };

  const search = searchOpen ? (
    // The results hang from the field, lined up with its left edge
    <div ref={searchWrapRef} className={classes.searchWrap}>
      <TextInput
        ref={searchRef}
        onBlur={() => !query && setSearchOpen(false)}
        type="search"
        aria-label={t('map.search.label')}
        placeholder={t('map.search.placeholder')}
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
      {view === 'map' && matchIds && (
        <MapSearchResults
          className={classes.results}
          path={path}
          query={query}
          results={results}
          active={active}
          selectedId={selectedId}
          currentId={next?.id ?? null}
          progress={progress}
          onActive={setActive}
          onSelect={openFromSearch}
        />
      )}
    </div>
  ) : query ? (
    // Folded with a search in it: the filter stays on, a click goes back to it, × drops it
    <div className={classes.searchButton} data-filter>
      <UnstyledButton onClick={openSearch} aria-label={t('map.search.withQuery', { query })} className={classes.searchReopen}>
        <IconSearch size={16} />
        <span className={classes.searchQuery}>{query}</span>
      </UnstyledButton>
      <ActionIcon size="sm" variant="subtle" color="gray" aria-label={t('map.search.clear')} onClick={() => setQuery('')}>
        <IconX size={14} />
      </ActionIcon>
    </div>
  ) : (
    <UnstyledButton onClick={openSearch} aria-label={t('map.search.label')} className={classes.searchButton}>
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
      aria-label={t('map.view.label')}
      className={classes.viewSwitch}
      data={[
        {
          value: 'map',
          label: (
            <Center style={{ gap: 6 }}>
              <IconSitemap size={14} />
              <span>{t('map.view.map')}</span>
            </Center>
          ),
        },
        {
          value: 'list',
          label: (
            <Center style={{ gap: 6 }}>
              <IconLayoutList size={14} />
              <span>{t('map.view.list')}</span>
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
      <MapOrphans path={path} selectedId={selectedId} onSelect={select} />
    </Stack>
  );

  // Title and the way on, in one row of the top bar
  const header = (
    <Group gap="md" wrap="nowrap" miw={0} style={{ flex: 1 }}>
      <Group gap="sm" wrap="nowrap" miw={0} style={{ flex: 1 }}>
        <ThemeIcon size={36} radius="xl" variant="light" color={look.color} style={{ flexShrink: 0 }}>
          <PageGlyph icon={look.icon} size={20} />
        </ThemeIcon>
        <Tooltip label={path.description} disabled={!path.description} multiline w={320} position="bottom-start" withArrow>
          <Title order={1} fz={20} lts={-0.3} lh={1.2} lineClamp={1}>
            {path.title}
          </Title>
        </Tooltip>
        {/* What can be done to the path itself */}
        <Menu position="bottom-start">
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label={t('map.header.more', { title: path.title })} style={{ flexShrink: 0 }}>
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <KindSwitchItem kind={path.kind} onSwitch={actions.setKind} />
          </Menu.Dropdown>
        </Menu>
        {/* Only while something is on its way, or was undone */}
        <Box visibleFrom="sm" style={{ flexShrink: 0 }}>
          <SaveStatus save={save} hideSaved />
        </Box>
      </Group>
      {/* Progress and the way on, as one control; a study's top bar keeps just its title */}
      {progress && (
        <>
          <Box visibleFrom="sm">
            <ContinueButton next={next} studied={studied} total={total} onContinue={() => next && select(next.id)} />
          </Box>
          <Box hiddenFrom="sm">
            <ContinueButton next={next} studied={studied} total={total} onContinue={() => next && select(next.id)} compact />
          </Box>
        </>
      )}
    </Group>
  );

  return (
    <AppFrame header={header}>
      <div className={classes.page}>
        <div className={classes.canvas}>
          {view === 'map' ? (
            <MindMap
              path={path}
              selectedId={selectedId}
              coveredRight={selectedId ? DRAWER_WIDTH + DRAWER_GAP * 2 : 0}
              currentId={next?.id ?? null}
              progress={progress}
              matchIds={matchIds}
              searchActiveId={searchOpen && results.length > 0 ? results[Math.min(active, results.length - 1)].id : null}
              focusRequest={focusRequest}
              onSelect={(pageId) => select(pageId)}
              onIntent={(pageId) => router.prefetch(pageHref(path.id, pageId))}
              topLeft={canvasTools}
              onAddBranch={setBranchFrom}
              branch={branchFrom && branchPrompt ? { from: branchFrom, prompt: branchPrompt } : null}
            />
          ) : (
            <MapList
              header={canvasTools}
              path={path}
              selectedId={selectedId}
              currentId={next?.id ?? null}
              progress={progress}
              matchIds={matchIds}
              onSelect={(pageId) => select(pageId)}
              onAddBranch={setBranchFrom}
              branch={branchFrom && branchPrompt ? { from: branchFrom, prompt: branchPrompt } : null}
            />
          )}
        </div>
      </div>
    </AppFrame>
  );
}
