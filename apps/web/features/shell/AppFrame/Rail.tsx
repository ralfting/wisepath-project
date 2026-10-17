'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ActionIcon, Anchor, Avatar, Box, Stack, ThemeIcon, Tooltip } from '@mantine/core';
import { IconHelpCircle, IconHome, IconInbox, IconRoute, IconSearch } from '@tabler/icons-react';
import { useSession } from '@/useCases/auth';
import { useT } from '@/i18n/I18nProvider';
import { usePaths } from '@/useCases/paths';
import { useInboxCount } from '@/useCases/inbox';
import { PageGlyph } from '@/features/paths/path';
import { openSearchPalette } from '@/features/search';
import { openHelp } from '@/features/help';
import classes from './AppFrame.module.css';

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
