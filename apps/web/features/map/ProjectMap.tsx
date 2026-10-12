'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Badge, Button, Group, Kbd, Progress, Stack, Tabs, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { IconLayoutList, IconPlayerPlayFilled, IconSearch, IconSitemap } from '@tabler/icons-react';
import type { Project } from '@wisepath/domain/projects';
import { displayTitle, lookOf, mapTree, nextPage, pagesInMapOrder, projectProgress } from '@wisepath/domain/projects';
import type { ProjectActions } from '@/useCases/projects';
import { ProjectGate } from '@/features/projects/ProjectGate';
import { AppFrame } from '@/features/shell/AppFrame';
import { PageGlyph } from '@/features/shared/look';
import { PagePanel } from '@/features/page/PagePanel';
import { MindMap } from './MindMap';
import type { FocusRequest } from './MindMap';
import { MapList } from './MapList';
import classes from './ProjectMap.module.css';

/**
 * ProjectMap
 * A map's home: its title and progress, the mind map (or the list), and the
 * selected page beside it. ?page= in the URL keeps the selection on reload.
 */

type View = 'map' | 'list';

export function ProjectMap({ projectId }: { projectId: string }) {
  return <ProjectGate projectId={projectId}>{(project, store) => <MapView project={project} store={store} />}</ProjectGate>;
}

function MapView({ project, store }: { project: Project; store: ProjectActions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  const initialPage = searchParams.get('page');
  const [view, setView] = useState<View>('map');
  const [selectedId, setSelectedId] = useState<string>(initialPage ?? project.rootPageId);
  const [query, setQuery] = useState('');
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(
    initialPage ? { pageId: initialPage, nonce: 1 } : null,
  );

  const selected = project.pages.find((p) => p.id === selectedId) ?? project.pages.find((p) => p.id === project.rootPageId)!;
  const next = nextPage(project);
  const { studied, total } = projectProgress(project);
  const percent = total ? Math.round((studied / total) * 100) : 0;
  const look = lookOf(project, project.rootPageId);

  const select = useCallback(
    (pageId: string, focus = false) => {
      setSelectedId(pageId);
      router.replace(pageId === project.rootPageId ? pathname : `${pathname}?page=${pageId}`, { scroll: false });
      if (focus) setFocusRequest((r) => ({ pageId, nonce: (r?.nonce ?? 0) + 1 }));
    },
    [router, pathname, project.rootPageId],
  );

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
    if (first) select(first.id, true);
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
              onClick={() => next && select(next.id, true)}
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
                selectedId={selected.id}
                currentId={next?.id ?? null}
                matchIds={matchIds}
                focusRequest={focusRequest}
                onSelect={(pageId) => select(pageId)}
              />
            ) : (
              <MapList
                project={project}
                selectedId={selected.id}
                currentId={next?.id ?? null}
                matchIds={matchIds}
                onSelect={(pageId) => select(pageId)}
              />
            )}
          </div>
          <div className={classes.side}>
            <PagePanel
              key={selected.id}
              project={project}
              page={selected}
              store={store}
              onSelect={(pageId) => select(pageId, true)}
              fullPageHref={`/projects/${project.id}/pages/${selected.id}`}
            />
          </div>
        </div>
      </Stack>
    </AppFrame>
  );
}
