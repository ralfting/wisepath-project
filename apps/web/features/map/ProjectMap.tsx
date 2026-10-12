'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Badge, Button, Group, Kbd, Progress, Stack, Tabs, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { IconLayoutList, IconPlayerPlayFilled, IconSearch, IconSitemap } from '@tabler/icons-react';
import type { Project } from '@wisepath/domain/projects';
import { displayTitle, lookOf, mapTree, nextPage, pagesInMapOrder, projectProgress } from '@wisepath/domain/projects';
import { ProjectGate } from '@/features/projects/ProjectGate';
import { AppFrame } from '@/features/shell/AppFrame';
import { PageGlyph } from '@/features/shared/look';
import { DRAWER_WIDTH } from '@/features/page/PageDrawer';
import { openPageId, pageHref } from '@/features/shared/routes';
import { MindMap } from './MindMap';
import type { FocusRequest } from './MindMap';
import { MapList } from './MapList';
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
  return <ProjectGate projectId={projectId}>{(project) => <MapView project={project} />}</ProjectGate>;
}

function MapView({ project }: { project: Project }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<View>('map');
  const [query, setQuery] = useState('');
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const selectedId = openPageId(pathname, project.id);
  const next = nextPage(project);
  const { studied, total } = projectProgress(project);
  const percent = total ? Math.round((studied / total) * 100) : 0;
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
    if (selectedId) setFocusRequest((r) => ({ pageId: selectedId, nonce: (r?.nonce ?? 0) + 1 }));
  }, [selectedId]);

  // ?open=<page> from a link outside the map: drop it from this entry, then open the drawer
  const toOpen = searchParams.get('open');
  useEffect(() => {
    if (!toOpen) return;
    window.history.replaceState(null, '', pathname);
    router.push(pageHref(project.id, toOpen), { scroll: false });
  }, [toOpen, pathname, project.id, router]);

  const matchIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set<string>(project.pages.filter((p) => displayTitle(p).toLowerCase().includes(q)).map((p) => p.id));
  }, [project.pages, query]);

  useHotkeys([['mod+K', () => searchRef.current?.focus()]]);

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') setQuery('');
    if (event.key !== 'Enter' || !matchIds || matchIds.size === 0) return;
    const first = [...pagesInMapOrder(project), ...mapTree(project).orphans].find((p) => matchIds.has(p.id));
    if (first) select(first.id);
  };

  const search = (
    <TextInput
      ref={searchRef}
      type="search"
      aria-label="Search this map"
      placeholder="Search this map…"
      leftSection={<IconSearch size={16} />}
      rightSection={<Kbd size="xs">⌘K</Kbd>}
      rightSectionWidth={44}
      value={query}
      onChange={(e) => setQuery(e.currentTarget.value)}
      onKeyDown={onSearchKeyDown}
      w={{ base: 160, sm: 260, md: 340 }}
      radius="md"
    />
  );

  return (
    <AppFrame crumbs={[{ label: 'My maps', href: '/projects' }, { label: project.title }]} tools={search}>
      <Stack gap="lg" className={classes.page}>
        <Group justify="space-between" align="center" gap="lg" className={classes.header}>
          <Group gap="lg" wrap="nowrap" miw={0} style={{ flex: '1 1 340px' }}>
            <ThemeIcon size={68} radius="xl" variant="light" color={look.color}>
              <PageGlyph icon={look.icon} size={36} />
            </ThemeIcon>
            <Stack gap={4} miw={0}>
              <Group gap="sm" wrap="nowrap">
                <Title order={1} fz={{ base: 26, sm: 34 }} lts={-0.6} lh={1.1} lineClamp={1}>
                  {project.title}
                </Title>
                {project.isSample && (
                  <Badge variant="light" color="gray" radius="sm">
                    Sample
                  </Badge>
                )}
              </Group>
              {project.description && (
                <Text c="dimmed" lineClamp={2}>
                  {project.description}
                </Text>
              )}
            </Stack>
          </Group>

          <Group gap="xl" wrap="nowrap" className={classes.progressBlock}>
            <Stack gap={6} w={240} visibleFrom="md">
              <Group gap="sm" wrap="nowrap">
                <Progress value={percent} size="lg" style={{ flex: 1 }} aria-label="Map progress" classNames={{ section: classes.progress }} />
                <Text fw={800} fz={20}>
                  {percent}%
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                {studied} of {total} pages studied
              </Text>
            </Stack>
            <Button
              size="md"
              leftSection={<IconPlayerPlayFilled size={16} />}
              disabled={!next}
              onClick={() => next && select(next.id)}
              className={classes.continue}
            >
              {next ? 'Continue studying' : total ? 'All pages studied' : 'No pages yet'}
            </Button>
          </Group>
        </Group>

        <Tabs value={view} onChange={(v) => setView((v as View) ?? 'map')} variant="pills" classNames={{ tab: classes.viewTab }}>
          <Tabs.List>
            <Tabs.Tab value="map" leftSection={<IconSitemap size={16} />}>
              Map
            </Tabs.Tab>
            <Tabs.Tab value="list" leftSection={<IconLayoutList size={16} />}>
              List
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <div className={classes.workspace}>
          <div className={classes.canvas}>
            {view === 'map' ? (
              <MindMap
                project={project}
                selectedId={selectedId}
                coveredRight={selectedId ? DRAWER_WIDTH : 0}
                currentId={next?.id ?? null}
                matchIds={matchIds}
                focusRequest={focusRequest}
                onSelect={(pageId) => select(pageId)}
              />
            ) : (
              <MapList
                project={project}
                selectedId={selectedId}
                currentId={next?.id ?? null}
                matchIds={matchIds}
                onSelect={(pageId) => select(pageId)}
              />
            )}
          </div>
        </div>
      </Stack>
    </AppFrame>
  );
}
