'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useReducedMotion } from '@mantine/hooks';
import { Anchor, Drawer, Stack, Text, Title } from '@mantine/core';
import { ProjectGate } from '@/features/projects/ProjectGate';
import { pageHref } from '@/features/shared/routes';
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

/** Closes the drawer with its exit animation, then leaves its URL */
const CloseDrawer = createContext<() => void>(() => {});

/** Matches the leave animation in PagePanel.module.css */
const LEAVE_MS = 180;

/**
 * The drawer animates with CSS keyframes rather than Mantine's transition:
 * Next mounts the route while it is still hidden, which would play a
 * state-driven transition before anyone sees it. Keyframes start when the
 * drawer actually appears: a short slide with a fade, settling softly.
 */
export function PageDrawerShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // A click on an empty spot outside closes the drawer: the map's background or
  // the page around it. Controls outside keep doing their own thing (another
  // page switches the drawer, links navigate), floating layers (menus,
  // popovers, the delete modal) belong to the drawer, and a drag that panned
  // the map is not a click
  const closeRef = useRef<() => void>(() => {});
  useEffect(() => {
    let down: { x: number; y: number } | null = null;
    const onDown = (event: PointerEvent) => {
      down = { x: event.clientX, y: event.clientY };
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const dragged = down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5;
      if (!target?.isConnected || dragged) return;
      if (target.closest('.mantine-Drawer-content, [data-portal], [role=dialog], [role=menu], [role=listbox]')) return;
      if (target.closest('a, button, input, textarea, select, label, [role=tab], [contenteditable=true]')) return;
      closeRef.current();
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  // Back to the map entry the drawer was opened from, or to the map when there is none
  const leave = () => {
    if (window.history.length > 1) router.back();
    else router.push(window.location.pathname.replace(/\/pages\/[^/]+$/, ''));
  };
  const close = () => {
    if (leaving) return;
    if (reduceMotion) return leave();
    setLeaving(true);
    timer.current = setTimeout(leave, LEAVE_MS);
  };
  closeRef.current = close;

  return (
    <Drawer
      opened
      onClose={close}
      transitionProps={{ duration: 0 }}
      position="right"
      size={DRAWER_WIDTH}
      withOverlay={false}
      lockScroll={false}
      trapFocus={false}
      closeOnClickOutside={false}
      withCloseButton={false}
      padding={0}
      shadow="xl"
      classNames={{ inner: classes.drawerInner, content: classes.drawer, body: classes.drawerBody }}
      data-leaving={leaving || undefined}
      aria-label="Page"
    >
      <CloseDrawer.Provider value={close}>{children}</CloseDrawer.Provider>
    </Drawer>
  );
}

export function PageDrawer({ projectId, pageId }: { projectId: string; pageId: string }) {
  const router = useRouter();
  const close = useContext(CloseDrawer);
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
