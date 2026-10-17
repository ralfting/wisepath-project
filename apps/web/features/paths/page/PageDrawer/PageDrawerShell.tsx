'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Drawer } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';
import classes from './PageDrawer.module.css';
import { DRAWER_WIDTH, DrawerContext } from './PageDrawer.helpers';
import { usePageDrawerShell } from './usePageDrawerShell';

/**
 * The drawer animates with CSS keyframes rather than Mantine's transition:
 * Next mounts the route while it is still hidden, which would play a
 * state-driven transition before anyone sees it. Keyframes start when the
 * drawer actually appears: a short slide with a fade, settling softly.
 */
export function PageDrawerShell({ children }: { children: ReactNode }) {
  const t = useT();
  const { state, operations } = usePageDrawerShell({ ownContentClass: classes.drawer });
  return (
    <Drawer.Root
      opened
      onClose={operations.escape}
      transitionProps={{ duration: 0 }}
      position="right"
      size={state.expanded ? '100%' : DRAWER_WIDTH}
      lockScroll={false}
      trapFocus={false}
      closeOnClickOutside={false}
      padding={0}
      shadow="xl"
      classNames={{ inner: classes.drawerInner, content: classes.drawer, body: classes.drawerBody }}
      data-leaving={state.leaving || undefined}
      data-expanded={state.expanded || undefined}
      style={{ '--drawer-left': `${state.sidebarEdge}px` } as CSSProperties}
    >
      {/* No overlay and no close button: the map stays usable, and the page's own top bar closes it.
          The dialog has no visible title, so it is named here for screen readers */}
      <Drawer.Content aria-label={t('page.drawer.label')}>
        <Drawer.Body>
          <DrawerContext.Provider value={state.controls}>{children}</DrawerContext.Provider>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
}
