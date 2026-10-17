'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ActionIcon, Anchor, AppShell, Avatar, Badge, Box, Group, NavLink, ScrollArea, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core';
import { IconHelpCircle, IconHome, IconInbox, IconRoute, IconSearch } from '@tabler/icons-react';
import { useSession } from '@/useCases/auth';
import { useT } from '@/i18n/I18nProvider';
import { usePaths } from '@/useCases/paths';
import { useInboxCount } from '@/useCases/inbox';
import { PageGlyph } from '@/features/paths/path';
import { openSearchPalette } from '@/features/search';
import { openHelp } from '@/features/help';
import classes from './AppFrame.module.css';
import { AccountMenu } from './AccountMenu';

/** The collapsed sidebar: the same places as icons; hovering it floats the full sidebar */
export function Rail() {
  const pathname = usePathname();
  const paths = usePaths();
  const inboxCount = useInboxCount();
  const session = useSession();
  const user = session.status === 'signedIn' ? session.user : null;
  const t = useT();

  return (
    <Stack h="100%" align="center" gap="xs" py="lg" className={classes.rail}>
      <Anchor component={Link} href="/paths" aria-label={t('shell.sidebar.home')} mb="sm">
        <ThemeIcon size={34} radius="md" variant="gradient" gradient={{ from: 'blue.6', to: 'cyan.5', deg: 135 }}>
          <IconRoute size={20} stroke={2} />
        </ThemeIcon>
      </Anchor>
      <ActionIcon
        component={Link}
        href="/paths"
        size={40}
        radius="md"
        variant={pathname === '/paths' ? 'light' : 'subtle'}
        color={pathname === '/paths' ? 'blue' : 'gray'}
        aria-label={t('shell.sidebar.myPaths')}
      >
        <IconHome size={20} stroke={1.7} />
      </ActionIcon>
      <ActionIcon
        component={Link}
        href="/inbox"
        size={40}
        radius="md"
        variant={pathname === '/inbox' ? 'light' : 'subtle'}
        color={pathname === '/inbox' ? 'blue' : 'gray'}
        aria-label={t('inbox.sidebar.waiting', { count: inboxCount ?? 0 })}
        className={classes.railInbox}
        data-count={inboxCount || undefined}
      >
        <IconInbox size={20} stroke={1.7} />
      </ActionIcon>
      <ActionIcon size={40} radius="md" variant="subtle" color="gray" onClick={openSearchPalette} aria-label={t('search.open')}>
        <IconSearch size={20} stroke={1.7} />
      </ActionIcon>
      <div className={classes.railRule} />
      {(paths ?? []).map((path) => {
        const href = `/paths/${path.id}`;
        const percent = path.total ? Math.round((path.studied / path.total) * 100) : 0;
        const progress = path.kind === 'learningPath';
        return (
          // A thin ring around the icon fills with a learning path's progress; a study's stays plain
          <Box
            key={path.id}
            className={classes.railMap}
            data-active={pathname.startsWith(href) || undefined}
            data-plain={!progress || undefined}
            style={{ '--progress': `${percent}%` }}
          >
            <ActionIcon
              component={Link}
              href={href}
              size={40}
              radius="xl"
              variant="light"
              color={path.color}
              aria-label={progress ? t('shell.rail.pathProgress', { title: path.title, percent }) : path.title}
            >
              <PageGlyph icon={path.icon} size={19} />
            </ActionIcon>
          </Box>
        );
      })}
      <Tooltip label={t('help.open')} position="right">
        <ActionIcon mt="auto" size={40} radius="md" variant="subtle" color="gray" onClick={openHelp} aria-label={t('help.open')}>
          <IconHelpCircle size={20} stroke={1.7} />
        </ActionIcon>
      </Tooltip>
      <Avatar radius="xl" color="blue" variant="filled" name={user?.displayName} aria-hidden="true" />
    </Stack>
  );
}

/** Logo, navigation, the learner's maps, and their account at the bottom */
export function Sidebar({ sidebarAction }: { sidebarAction: ReactNode }) {
  const pathname = usePathname();
  const paths = usePaths();
  const inboxCount = useInboxCount();
  const t = useT();

  return (
    <>
      <AppShell.Section px="lg" pt="lg" pb="md">
        <Group justify="space-between" wrap="nowrap">
          <Anchor component={Link} href="/paths" underline="never" c="inherit">
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon size={34} radius="md" variant="gradient" gradient={{ from: 'blue.6', to: 'cyan.5', deg: 135 }}>
                <IconRoute size={20} stroke={2} />
              </ThemeIcon>
              <Text fw={800} fz={20} lts={-0.3}>
                WisePath
              </Text>
            </Group>
          </Anchor>
          {sidebarAction}
        </Group>
      </AppShell.Section>

      <AppShell.Section px="sm">
        <NavLink
          component={Link}
          href="/paths"
          label={t('shell.sidebar.myPaths')}
          active={pathname === '/paths'}
          leftSection={<IconHome size={20} stroke={1.7} />}
          rightSection={
            paths && paths.length > 0 ? (
              <Badge size="sm" variant="light" circle>
                {paths.length}
              </Badge>
            ) : null
          }
          className={classes.navLink}
        />
        <NavLink
          component={Link}
          href="/inbox"
          label={t('inbox.sidebar.link')}
          aria-label={inboxCount !== null ? t('inbox.sidebar.waiting', { count: inboxCount }) : undefined}
          active={pathname === '/inbox'}
          leftSection={<IconInbox size={20} stroke={1.7} />}
          rightSection={
            inboxCount ? (
              <Badge size="sm" variant="light" circle aria-hidden>
                {inboxCount}
              </Badge>
            ) : null
          }
          className={classes.navLink}
        />
        <NavLink
          component="button"
          onClick={openSearchPalette}
          label={t('search.open')}
          leftSection={<IconSearch size={20} stroke={1.7} />}
          rightSection={<SearchShortcut />}
          className={classes.navLink}
        />
      </AppShell.Section>

      <AppShell.Section grow component={ScrollArea} px="sm" pt="lg">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.6} px="sm" pb={6}>
          {t('shell.sidebar.paths')}
        </Text>
        {(paths ?? []).map((path) => {
          const { studied, total } = path;
          const href = `/paths/${path.id}`;
          // Only a learning path has a share studied to show
          const progress = path.kind === 'learningPath';
          return (
            <NavLink
              key={path.id}
              component={Link}
              href={href}
              label={path.title}
              active={pathname.startsWith(href)}
              leftSection={
                <ThemeIcon size={30} radius="xl" variant="light" color={path.color}>
                  <PageGlyph icon={path.icon} size={17} />
                </ThemeIcon>
              }
              rightSection={
                progress && (
                  <Text size="sm" c="dimmed">
                    {total ? Math.round((studied / total) * 100) : 0}%
                  </Text>
                )
              }
              className={classes.navLink}
            />
          );
        })}
      </AppShell.Section>

      <AppShell.Section p="sm" className={classes.account}>
        <NavLink
          component="button"
          onClick={openHelp}
          label={t('help.open')}
          leftSection={<IconHelpCircle size={20} stroke={1.7} />}
          className={classes.navLink}
          mb={4}
        />
        <AccountMenu />
      </AppShell.Section>
    </>
  );
}

/** ⌘P (Ctrl P) beside the search link, where there is a keyboard */
function SearchShortcut() {
  const [keys, setKeys] = useState<string | null>(null);
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    setKeys(/Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘P' : 'Ctrl P');
  }, []);
  return keys ? (
    <Text size="xs" c="dimmed" aria-hidden>
      {keys}
    </Text>
  ) : null;
}
