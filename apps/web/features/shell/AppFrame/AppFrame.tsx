'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ActionIcon, AppShell, Box, Burger, Group, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from '@tabler/icons-react';
import { useLogout, useSession } from '@/useCases/auth';
import { useT } from '@/i18n/I18nProvider';
import { CaptureLauncher } from '@/features/inbox/capture';
import { SearchPaletteHost } from '@/features/search';
import { HelpHost } from '@/features/help';
import classes from './AppFrame.module.css';
import { Sidebar } from './Sidebar';
import { Rail } from './Rail';
import { CrumbTrail } from './CrumbTrail';
import type { Crumb } from './AppFrame.helpers';

/**
 * AppFrame
 * The signed-in layout: a sidebar with the learner's maps and their account,
 * and a top bar with breadcrumbs and an optional slot, or a page's own header
 * in its place (the map puts its title, search and progress there).
 * On desktop the sidebar can be collapsed to a rail of icons; resting the
 * pointer on the rail floats the full sidebar over the content, where it can
 * be pinned open again.
 */

const COLLAPSED_KEY = 'wisepath:sidebar-collapsed';

const SIDEBAR_WIDTH = 264;

const RAIL_WIDTH = 64;

/** The collapsed choice, remembered on this device; storage can be unavailable */
function useCollapsed(): [boolean, (collapsed: boolean) => void] {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
    } catch {
      // Keep the sidebar open
    }
  }, []);
  const set = (next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
    } catch {
      // The choice lasts until reload
    }
  };
  return [collapsed, set];
}

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
  const [opened, { toggle, close }] = useDisclosure(false);
  const [collapsed, setCollapsed] = useCollapsed();
  const [peeking, setPeeking] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const logout = useLogout();
  const t = useT();

  // A cookie that no longer opens a session: clear it, then log in again
  useEffect(() => {
    if (session.status !== 'signedOut') return;
    logout().finally(() => router.replace('/login'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status]);

  useEffect(() => {
    close();
    setPeeking(false);
  }, [pathname, close]);

  // The pointer can open the sidebar from the rail and move away without ever
  // entering it, so close it once the pointer is clearly past its right side
  useEffect(() => {
    if (!peeking) return;
    const onMove = (event: PointerEvent) => {
      if (event.clientX > SIDEBAR_WIDTH + 40) setPeeking(false);
    };
    document.addEventListener('pointermove', onMove);
    return () => document.removeEventListener('pointermove', onMove);
  }, [peeking]);

  return (
    <AppShell
      navbar={{ width: { base: SIDEBAR_WIDTH, sm: collapsed ? RAIL_WIDTH : SIDEBAR_WIDTH }, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding={0}
    >
      <AppShell.Navbar className={classes.navbar}>
        {collapsed ? (
          <>
            {/* The rail on desktop; the full sidebar still opens from the burger on a phone */}
            <Box visibleFrom="sm" h="100%" onMouseEnter={() => setPeeking(true)}>
              <Rail />
            </Box>
            <Box hiddenFrom="sm" h="100%" className={classes.column}>
              <Sidebar sidebarAction={null} />
            </Box>
          </>
        ) : (
          <Sidebar
            sidebarAction={
              <Tooltip label={t('shell.sidebar.collapse')} position="right">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => setCollapsed(true)}
                  aria-label={t('shell.sidebar.collapse')}
                  visibleFrom="sm"
                >
                  <IconLayoutSidebarLeftCollapse size={19} />
                </ActionIcon>
              </Tooltip>
            }
          />
        )}
      </AppShell.Navbar>

      {collapsed && (
        <>
          <nav
            className={classes.peek}
            data-open={peeking || undefined}
            onMouseLeave={() => setPeeking(false)}
            aria-label={t('shell.sidebar.label')}
            aria-hidden={!peeking}
            inert={!peeking}
          >
            <Sidebar
              sidebarAction={
                <Tooltip label={t('shell.sidebar.keepOpen')} position="right">
                  <ActionIcon variant="subtle" color="gray" onClick={() => setCollapsed(false)} aria-label={t('shell.sidebar.keepOpen')}>
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
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label={t('shell.sidebar.openNavigation')} />
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
    </AppShell>
  );
}
