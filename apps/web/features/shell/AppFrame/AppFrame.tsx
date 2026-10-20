'use client';

import type { ReactNode } from 'react';
import { ActionIcon, AppShell, Box, Burger, CloseButton, Group, Tooltip } from '@mantine/core';
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import { CaptureLauncher } from '@/features/inbox/capture';
import { SearchPaletteHost } from '@/features/search';
import { HelpHost } from '@/features/help';
import { AccessNotices } from '@/features/paths/path';
import classes from './AppFrame.module.css';
import { Sidebar } from './Sidebar';
import { Rail } from './Rail';
import { CrumbTrail } from './CrumbTrail';
import { RAIL_WIDTH, SIDEBAR_WIDTH } from './AppFrame.helpers';
import type { Crumb } from './AppFrame.helpers';
import { useAppFrame } from './useAppFrame';

/**
 * The signed-in layout: a sidebar with the learner's maps and their account,
 * and a top bar with breadcrumbs and an optional slot, or a page's own header
 * in its place (the map puts its title, search and progress there).
 * On desktop the sidebar can be collapsed to a rail of icons; resting the
 * pointer on the rail floats the full sidebar over the content, where it can
 * be pinned open again.
 */
export function AppFrame({
  crumbs = [],
  tools,
  header,
  children,
}: {
  crumbs?: Crumb[];
  tools?: ReactNode;
  /** Replaces the breadcrumbs and tools in the top bar */
  header?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  const { state, operations } = useAppFrame();
  // On a phone the navigation covers the screen, the burger that opened it included, so it closes from here
  const closeNavigation = (
    <CloseButton size="lg" hiddenFrom="sm" onClick={operations.closeNavigation} aria-label={t('shell.sidebar.closeNavigation')} />
  );

  return (
    <AppShell
      navbar={{ width: { base: SIDEBAR_WIDTH, sm: state.collapsed ? RAIL_WIDTH : SIDEBAR_WIDTH }, breakpoint: 'sm', collapsed: { mobile: !state.opened } }}
      padding={0}
      className={classes.shell}
      data-navigation-open={state.opened || undefined}
    >
      <AppShell.Navbar className={classes.navbar}>
        {state.collapsed ? (
          <>
            {/* The rail on desktop; the full sidebar still opens from the burger on a phone */}
            <Box visibleFrom="sm" h="100%" onMouseEnter={operations.peek}>
              <Rail />
            </Box>
            <Box hiddenFrom="sm" h="100%" className={classes.column}>
              <Sidebar sidebarAction={closeNavigation} />
            </Box>
          </>
        ) : (
          <Sidebar
            sidebarAction={
              <>
                <Tooltip label={t('shell.sidebar.collapse')} position="right">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={operations.collapse}
                    aria-label={t('shell.sidebar.collapse')}
                    visibleFrom="sm"
                  >
                    <IconLayoutSidebarLeftCollapse size={19} />
                  </ActionIcon>
                </Tooltip>
                {closeNavigation}
              </>
            }
          />
        )}
      </AppShell.Navbar>

      {state.collapsed && (
        <>
          <nav
            className={classes.peek}
            data-open={state.peeking || undefined}
            onMouseLeave={operations.stopPeeking}
            aria-label={t('shell.sidebar.label')}
            aria-hidden={!state.peeking}
            inert={!state.peeking}
          >
            <Sidebar
              sidebarAction={
                <Tooltip label={t('shell.sidebar.keepOpen')} position="right">
                  <ActionIcon variant="subtle" color="gray" onClick={operations.keepOpen} aria-label={t('shell.sidebar.keepOpen')}>
                    <IconLayoutSidebarLeftExpand size={19} />
                  </ActionIcon>
                </Tooltip>
              }
            />
          </nav>
        </>
      )}

      <AppShell.Main className={classes.main}>
        <Group component="header" className={classes.topbar} gap="md" wrap="nowrap">
          <Burger opened={state.opened} onClick={operations.toggleNavigation} hiddenFrom="sm" size="sm" aria-label={t('shell.sidebar.openNavigation')} />
          {header ?? (
            <>
              <CrumbTrail crumbs={crumbs} />
              {tools && (
                <Group gap="md" ml="auto" wrap="nowrap">
                  {tools}
                </Group>
              )}
            </>
          )}
        </Group>
        {children}
        <CaptureLauncher />
      </AppShell.Main>
      <SearchPaletteHost />
      <HelpHost />
      <AccessNotices />
    </AppShell>
  );
}
