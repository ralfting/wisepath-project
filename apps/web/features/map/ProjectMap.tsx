'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ActionIcon, Badge, Box, Button, Center, Group, Kbd, Progress, SegmentedControl, Text, TextInput, ThemeIcon, Title, Tooltip, VisuallyHidden } from '@mantine/core';
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
      w={{ sm: 220, lg: 300 }}
      visibleFrom="sm"
      style={{ flexShrink: 1 }}
      radius="md"
    />
  );

  const viewSwitch = (
    <SegmentedControl
      size="xs"
      value={view}
      onChange={(v) => setView(v as View)}
      aria-label="View"
      className={classes.viewSwitch}
      ml={{ base: 0, sm: 'xs' }}
      data={[
        {
          value: 'map',
          label: (
            <Center style={{ gap: 6 }}>
              <IconSitemap size={15} />
              <Box component="span" visibleFrom="sm">
                Map
              </Box>
            </Center>
          ),
        },
        {
          value: 'list',
          label: (
            <Center style={{ gap: 6 }}>
              <IconLayoutList size={15} />
              <Box component="span" visibleFrom="sm">
                List
              </Box>
            </Center>
          ),
        },
      ]}
    />
  );

  // Title, search, progress and the way on, in one row of the top bar
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
        {project.isSample && (
          <Badge variant="light" color="gray" radius="sm" visibleFrom="sm" style={{ flexShrink: 0 }}>
            Sample
          </Badge>
        )}
        {/* What the page shows: the map or the list */}
        {viewSwitch}
      </Group>
      {search}
      <Tooltip label={`${studied} of ${total} pages studied`}>
        <Group gap={8} wrap="nowrap" visibleFrom="md" style={{ flexShrink: 0 }}>
          <Progress value={percent} size="md" w={88} aria-label="Map progress" classNames={{ section: classes.progress }} />
          <Text fw={700} size="sm">
            {percent}%
          </Text>
          <VisuallyHidden>
            {studied} of {total} pages studied
          </VisuallyHidden>
        </Group>
      </Tooltip>
      <Button
        size="sm"
        leftSection={<IconPlayerPlayFilled size={14} />}
        disabled={!next}
        onClick={() => next && select(next.id)}
        className={classes.continue}
        style={{ flexShrink: 0 }}
        visibleFrom="sm"
      >
        {next ? 'Continue studying' : total ? 'All pages studied' : 'No pages yet'}
      </Button>
      {/* On a phone the title needs the room: the same action as an icon */}
      <ActionIcon
        size="lg"
        radius="md"
        disabled={!next}
        onClick={() => next && select(next.id)}
        aria-label="Continue studying"
        hiddenFrom="sm"
      >
        <IconPlayerPlayFilled size={16} />
      </ActionIcon>
    </Group>
  );

  return (
    <AppFrame header={header}>
      <div className={classes.page}>
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
              onIntent={(pageId) => router.prefetch(pageHref(project.id, pageId))}
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
    </AppFrame>
  );
}
