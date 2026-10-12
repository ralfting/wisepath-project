'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { countStudied, displayTitle, pagesInOrder } from '../entities/project.entity';
import { useProjectStore } from '../hooks/useProjectStore';
import { StarChart } from './StarChart';
import type { FocusRequest } from './StarChart';
import { PageList } from './PageList';
import { PageSheet } from './PageSheet';
import type { PageActions } from './PageContent';
import { Anchor, Button, Group, Tabs, Text, TextInput } from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import classes from './ProjectMap.module.css';

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


  return (
    <Tabs value={tab} onChange={(value) => setTab((value as Tab) ?? 'map')} variant="pills" className={classes.shell}>
      <header className={classes.header}>
        <Group gap="lg" wrap="nowrap" miw={0}>
          <Anchor component={Link} href="/projects" fw={700} fz={17} c="inherit" underline="never">
            WisePath
          </Anchor>
          <Text component="nav" aria-label="Breadcrumb" c="dimmed" fz={15} className={classes.breadcrumb}>
            <Anchor component={Link} href="/projects" className={classes.crumbLink} c="dimmed">
              Projects
            </Anchor>
            <span aria-hidden="true"> / </span>
            <Text span fw={700} c="var(--mantine-color-text)" aria-current="page">
              {project.title}
            </Text>
          </Text>
        </Group>

        <Tabs.List aria-label="View">
          {TABS.map(({ id, label }) => (
            <Tabs.Tab key={id} value={id} id={`tab-${id}`} py={6}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <TextInput
          type="search"
          aria-label="Search pages"
          placeholder="Search pages"
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={onSearchKeyDown}
          className={`${classes.fullRow} ${classes.search}`}
        />

        <Group justify="space-between" gap="lg" className={classes.fullRow}>
          {total > 0 && (
            <Text size="sm" c="dimmed">
              <Text span fw={700} c="var(--mantine-color-text)">
                {studied}
              </Text>{' '}
              of {total} studied
            </Text>
          )}
          <Button color="finder.6" leftSection={<IconPlus size={16} />} onClick={startAdding}>
            Add page
          </Button>
        </Group>
      </header>

      <main className={classes.main} data-sheet-open={openPage ? true : undefined}>
        <Tabs.Panel value={tab} className={classes.panel}>
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
        </Tabs.Panel>

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
    </Tabs>
  );
}
