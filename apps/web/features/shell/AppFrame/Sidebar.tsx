'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Anchor, AppShell, Badge, Group, NavLink, ScrollArea, Text, ThemeIcon } from '@mantine/core';
import { IconHelpCircle, IconHome, IconInbox, IconRoute, IconSearch } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import { usePaths } from '@/useCases/paths';
import { useInboxCount } from '@/useCases/inbox';
import { PageGlyph } from '@/features/paths/path';
import { openSearchPalette } from '@/features/search';
import { openHelp } from '@/features/help';
import classes from './AppFrame.module.css';
import { AccountMenu } from './AccountMenu';
import { SearchShortcut } from './SearchShortcut';

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
