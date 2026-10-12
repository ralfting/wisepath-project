'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Anchor, Card, Center, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import Link from 'next/link';
import type { Project } from '@wisepath/domain/projects';
import { displayTitle, lookOf, pathTo } from '@wisepath/domain/projects';
import type { ProjectActions } from '@/useCases/projects';
import { ProjectGate } from '@/features/projects/ProjectGate';
import { AppFrame } from '@/features/shell/AppFrame';
import type { Crumb } from '@/features/shell/AppFrame';
import { PageGlyph } from '@/features/shared/look';
import { PageContent } from './PageContent';
import type { PageActions } from './PageContent';
import { StudiedToggle } from './StudiedToggle';

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
    ...between.map((p) => ({ label: displayTitle(p), href: `${mapHref}?page=${p.id}` })),
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
      <Card component="main" maw={880} w="100%" mx="auto" mb="xl" padding="xl">
        <Group justify="space-between" mb="lg">
          <Group gap="sm">
            <ThemeIcon size={44} radius="xl" variant="light" color={look.color}>
              <PageGlyph icon={isRoot || page.module ? look.icon : 'book'} size={23} />
            </ThemeIcon>
            <Anchor component={Link} href={`${mapHref}?page=${page.id}`} size="sm">
              See it on the map
            </Anchor>
          </Group>
          {!isRoot && (
            <StudiedToggle studied={page.studied} onChange={(studied) => store.updatePage(page.id, { studied })} />
          )}
        </Group>
        <PageContent project={project} page={page} actions={actions} isFresh={isFresh} titleSize={38} toolbarOffset={0} />
      </Card>
    </AppFrame>
  );
}
