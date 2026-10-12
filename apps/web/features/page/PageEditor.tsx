'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ActionIcon, Anchor, Box, Card, Center, Group, Menu, Stack, Text, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { IconDotsVertical, IconSitemap, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Project } from '@wisepath/domain/projects';
import { branchProgress, displayTitle, lookOf, pathTo, projectProgress } from '@wisepath/domain/projects';
import type { ProjectActions } from '@/useCases/projects';
import { ProjectGate } from '@/features/projects/ProjectGate';
import { AppFrame } from '@/features/shell/AppFrame';
import type { Crumb } from '@/features/shell/AppFrame';
import { PageGlyph } from '@/features/shared/look';
import { mapWithPageHref } from '@/features/shared/routes';
import { PageContent, PageTitleInput } from './PageContent';
import type { PageActions } from './PageContent';
import { DeletePageModal } from './DeletePageModal';
import { StudiedToggle } from './StudiedToggle';
import classes from './PageEditor.module.css';

/**
 * PageEditor
 * Full-screen page, edited in place like the map's panel, for longer writing.
 */
export function PageEditor({ projectId, pageId }: { projectId: string; pageId: string }) {
  return (
    <ProjectGate projectId={projectId}>
      {(project, store) => <EditorView project={project} store={store} pageId={pageId} />}
    </ProjectGate>
  );
}

function EditorView({ project, store, pageId }: { project: Project; store: ProjectActions; pageId: string }) {
  const router = useRouter();
  const page = project.pages.find((p) => p.id === pageId);
  const isFresh = useSearchParams().get('new') === '1';
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mapHref = `/projects/${project.id}`;
  const pageHref = (id: string) => `/projects/${project.id}/pages/${id}`;

  if (!page) {
    return (
      <AppFrame crumbs={[{ label: 'My maps', href: '/projects' }, { label: project.title, href: mapHref }]}>
        <Center component="main" flex={1} p="md">
          <Stack gap="sm" align="center" maw={420} ta="center">
            <Title order={1} fz={30}>
              Page not found
            </Title>
            <Text c="dimmed">It may have been deleted. The rest of the map is still there.</Text>
            <Anchor component={Link} href={mapHref} fw={700}>
              Back to the map
            </Anchor>
          </Stack>
        </Center>
      </AppFrame>
    );
  }

  const isRoot = page.id === project.rootPageId;
  const look = lookOf(project, page.id);
  const between = pathTo(project, page.id).slice(1, -1);
  const crumbs: Crumb[] = [
    { label: 'My maps', href: '/projects' },
    { label: project.title, href: mapHref },
    ...between.map((p) => ({ label: displayTitle(p), href: mapWithPageHref(project.id, p.id) })),
    ...(isRoot ? [] : [{ label: displayTitle(page) }]),
  ];

  const actions: PageActions = {
    updatePage: store.updatePage,
    renameLinks: store.renameLinks,
    openPage: (id) => router.push(pageHref(id)),
    createLinkedPage: (title) => router.push(pageHref(store.createPage(title).id)),
  };

  return (
    <AppFrame crumbs={crumbs}>
      <Card component="main" mx={{ base: 'md', sm: 'xl' }} mb="xl" padding="xl" className={classes.sheet}>
        <Group justify="space-between" align="center" wrap="nowrap" gap="lg" mb="lg" className={classes.header}>
          <Group gap="md" wrap="nowrap" miw={0} style={{ flex: 1 }}>
            <ThemeIcon size={48} radius="xl" variant="light" color={look.color} style={{ flexShrink: 0 }}>
              <PageGlyph icon={isRoot || page.module ? look.icon : 'book'} size={25} />
            </ThemeIcon>
            <Box miw={0} style={{ flex: 1 }}>
              <PageTitleInput key={page.id} project={project} page={page} actions={store} size={34} autoFocus={isFresh} />
            </Box>
          </Group>
          <Group gap="sm" wrap="nowrap">
            <SavedAt updatedAt={page.updatedAt} />
            {!isRoot && (
              <StudiedToggle
                studied={page.studied}
                onChange={(studied) => store.updatePage(page.id, { studied })}
                progress={{ map: project.title, ...projectProgress(project) }}
              />
            )}
            <Tooltip label="See it on the map">
              <ActionIcon
                component={Link}
                href={mapWithPageHref(project.id, page.id)}
                variant="default"
                size="lg"
                radius="md"
                aria-label="See it on the map"
              >
                <IconSitemap size={18} />
              </ActionIcon>
            </Tooltip>
            {!isRoot && (
              <Menu position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="default" size="lg" radius="md" aria-label="More">
                    <IconDotsVertical size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => setConfirmDelete(true)}>
                    Delete page
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </Group>
        <DeletePageModal
          opened={confirmDelete}
          title={displayTitle(page)}
          orphansPages={(branchProgress(project, page.id)?.total ?? 0) > 0}
          onClose={() => setConfirmDelete(false)}
          onDelete={() => {
            // Leave first, so this page never renders as "not found" on the way out
            const back = between.at(-1)?.id ?? project.rootPageId;
            router.push(mapWithPageHref(project.id, back));
            store.deletePage(page.id);
          }}
        />
        <PageContent project={project} page={page} actions={actions} showTitle={false} toolbarOffset={0} />
      </Card>
    </AppFrame>
  );
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 30],
  ['month', 12],
  ['year', Infinity],
];

/** "3 minutes ago" from an ISO date */
function ago(iso: string, now: number): string {
  let value = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(value) < size || unit === 'year') return relative.format(Math.round(value), unit);
    value /= size;
  }
  return '';
}

/** When the page was last edited; edits save to this device a moment later */
function SavedAt({ updatedAt }: { updatedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [updatedAt]);
  if (!updatedAt || Number.isNaN(new Date(updatedAt).getTime())) return null;
  return (
    <Tooltip label={`Saved on this device · ${new Date(updatedAt).toLocaleString()}`}>
      <Text size="sm" c="dimmed" visibleFrom="md" style={{ whiteSpace: 'nowrap' }}>
        Saved · edited {ago(updatedAt, now)}
      </Text>
    </Tooltip>
  );
}
