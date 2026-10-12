'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Anchor, Drawer, Stack, Text, Title } from '@mantine/core';
import { ProjectGate } from '@/features/projects/ProjectGate';
import { mapHref, pageHref } from '@/features/shared/routes';
import { PagePanel } from './PagePanel';
import classes from './PagePanel.module.css';

/**
 * PageDrawer
 * A page opened from the map, in a drawer over it. The URL is the page's own
 * (/projects/:id/pages/:pageId), so back closes it and reload or the expand
 * button shows the full page. The map behind stays usable: clicking another
 * page switches the drawer to it.
 */

export const DRAWER_WIDTH = 460;

/** Leaves the drawer: back to the map entry it was opened from, or to the map if there is none */
function useCloseDrawer(projectId?: string) {
  const router = useRouter();
  return () => {
    if (window.history.length > 1) router.back();
    else if (projectId) router.push(mapHref(projectId));
  };
}

export function PageDrawerShell({ children }: { children: ReactNode }) {
  const close = useCloseDrawer();
  return (
    <Drawer
      opened
      onClose={close}
      position="right"
      size={DRAWER_WIDTH}
      withOverlay={false}
      lockScroll={false}
      trapFocus={false}
      closeOnClickOutside={false}
      withCloseButton={false}
      padding={0}
      shadow="xl"
      classNames={{ content: classes.drawer, body: classes.drawerBody }}
      aria-label="Page"
    >
      {children}
    </Drawer>
  );
}

export function PageDrawer({ projectId, pageId }: { projectId: string; pageId: string }) {
  const router = useRouter();
  const close = useCloseDrawer(projectId);
  return (
    <ProjectGate projectId={projectId}>
      {(project, store) => {
        const page = project.pages.find((p) => p.id === pageId);
        if (!page) {
          return (
            <Stack gap="sm" p="xl">
              <Title order={2} fz={22}>
                Page not found
              </Title>
              <Text c="dimmed">It may have been deleted. The rest of the map is still there.</Text>
              <Anchor component="button" type="button" onClick={close} fw={700} ta="left">
                Close
              </Anchor>
            </Stack>
          );
        }
        return (
          <PagePanel
            project={project}
            page={page}
            store={store}
            // Moving between pages replaces the entry, so back still closes the drawer in one step
            onSelect={(id) => router.replace(pageHref(project.id, id), { scroll: false })}
            fullPageHref={pageHref(project.id, page.id)}
            onClose={close}
            flat
          />
        );
      }}
    </ProjectGate>
  );
}
