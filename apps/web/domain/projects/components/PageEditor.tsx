'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { displayTitle } from '../entities/project.entity';
import { useProjectStore } from '../hooks/useProjectStore';
import { PageContent } from './PageContent';
import type { PageActions } from './PageContent';
import { StudiedToggle } from './StudiedToggle';
import { Anchor, Box, Button, Center, Group, Stack, Text, Title } from '@mantine/core';
import { IconChevronLeft } from '@tabler/icons-react';
import classes from './PageEditor.module.css';

/**
 * PageEditor
 * Full-screen page, edited in place like the map's sheet, for longer writing.
 */
export function PageEditor({ pageId }: { pageId: string }) {
  const router = useRouter();
  const store = useProjectStore();
  const { project, ready } = store;
  const page = project.pages.find((p) => p.id === pageId);
  const isFresh = useSearchParams().get('new') === '1';
  const pageHref = (id: string) => `/projects/${project.id}/pages/${id}`;

  // Wait for the saved copy so the editor never starts from stale sample text
  if (!ready) return null;
  if (!page) {
    return (
      <Center component="main" mih="100vh" p="md">
        <Stack gap="sm" align="center" maw={420} ta="center">
          <Title order={1} fz={30}>
            Page not found
          </Title>
          <Text c="dimmed">It may have been deleted. The rest of the project is on the map.</Text>
          <Anchor component={Link} href={`/projects/${project.id}`} fw={700}>
            Back to the map
          </Anchor>
        </Stack>
      </Center>
    );
  }

  const actions: PageActions = {
    updatePage: store.updatePage,
    renameLinks: store.renameLinks,
    openPage: (id) => router.push(pageHref(id)),
    addChild: (parentId, title) => {
      store.addChild(parentId, title);
    },
    createLinkedPage: (title) => router.push(pageHref(store.addPage(title).id)),
    deletePage: (id) => {
      store.deletePage(id);
      router.push(`/projects/${project.id}`);
    },
  };

  return (
    <Box mih="100vh">
      <Group component="header" gap="md" wrap="nowrap" className={classes.header}>
        <Button
          component={Link}
          href={`/projects/${project.id}?page=${page.id}`}
          variant="subtle"
          color="gray"
          c="var(--mantine-color-text)"
          size="compact-sm"
          leftSection={<IconChevronLeft size={16} />}
        >
          Map
        </Button>
        <Text component="nav" aria-label="Breadcrumb" c="dimmed" fz={15} visibleFrom="sm" className={classes.breadcrumb}>
          <Anchor component={Link} href={`/projects/${project.id}`} c="dimmed">
            {project.title}
          </Anchor>
          <span aria-hidden="true"> / </span>
          <Text span c="var(--mantine-color-text)" aria-current="page">
            {displayTitle(page)}
          </Text>
        </Text>
        <Group gap="md" ml="auto" wrap="nowrap">
          <Text size="sm" c="dimmed" visibleFrom="md">
            Saved on this device
          </Text>
          <StudiedToggle studied={page.studied} onChange={(studied) => store.updatePage(page.id, { studied })} />
        </Group>
      </Group>

      <Box component="main" maw="78ch" mx="auto" px={{ base: 'lg', sm: 'xl' }} pt={40} pb={80}>
        <PageContent
          project={project}
          page={page}
          actions={actions}
          isFresh={isFresh}
          titleSize={40}
          toolbarOffset={56}
        />
      </Box>
    </Box>
  );
}
