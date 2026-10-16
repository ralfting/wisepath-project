'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Collapse,
  ActionIcon,
  Anchor,
  AppShell,
  Avatar,
  Badge,
  Box,
  Breadcrumbs,
  Burger,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
  VisuallyHidden,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconChevronDown,
  IconChevronRight,
  IconHome,
  IconInbox,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconCheck,
  IconLanguage,
  IconLogout,
  IconRoute,
  IconSearch,
  IconSelector,
} from '@tabler/icons-react';
import { useLogout, useSaveLocale, useSession } from '@/useCases/auth';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { LOCALES, LOCALE_NAMES } from '@/i18n/locales';
import { Flag } from '@/i18n/Flag';
import type { Locale } from '@/i18n/locales';
import { useProjects } from '@/useCases/projects';
import { useInboxCount } from '@/useCases/inbox';
import { CaptureLauncher } from '@/features/capture';
import { PageGlyph } from '@/features/shared/look';
import { SearchPaletteHost, openSearchPalette } from '@/features/search';
import classes from './AppFrame.module.css';

/**
 * AppFrame
 * The signed-in layout: a sidebar with the learner's maps and their account,
 * and a top bar with breadcrumbs and an optional slot, or a page's own header
 * in its place (the map puts its title, search and progress there).
 * On desktop the sidebar can be collapsed to a rail of icons; resting the
 * pointer on the rail floats the full sidebar over the content, where it can
 * be pinned open again.
 */

export interface Crumb {
  label: string;
  href?: string;
}

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
    </AppShell>
  );
}

/** The breadcrumbs of the top bar */
export function CrumbTrail({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <Breadcrumbs separator={<IconChevronRight size={14} />} className={classes.crumbs} visibleFrom="xs">
      {crumbs.map((c, i) =>
        c.href ? (
          <Anchor key={i} component={Link} href={c.href} size="sm" c="dimmed">
            {c.label}
          </Anchor>
        ) : (
          <Text key={i} size="sm" fw={600} aria-current="page" truncate>
            {c.label}
          </Text>
        ),
      )}
    </Breadcrumbs>
  );
}

/** A top bar like the frame's, for content that draws its own (the expanded page drawer) */
export function TopBar({ children }: { children: ReactNode }) {
  return (
    <Group component="header" className={classes.topbar} gap="md" wrap="nowrap">
      {children}
    </Group>
  );
}

/** The collapsed sidebar: the same places as icons; hovering it floats the full sidebar */
function Rail() {
  const pathname = usePathname();
  const projects = useProjects();
  const inboxCount = useInboxCount();
  const session = useSession();
  const user = session.status === 'signedIn' ? session.user : null;
  const t = useT();

  return (
    <Stack h="100%" align="center" gap="xs" py="lg" className={classes.rail}>
      <Anchor component={Link} href="/projects" aria-label={t('shell.sidebar.home')} mb="sm">
        <ThemeIcon size={34} radius="md" variant="gradient" gradient={{ from: 'blue.6', to: 'cyan.5', deg: 135 }}>
          <IconRoute size={20} stroke={2} />
        </ThemeIcon>
      </Anchor>
      <ActionIcon
        component={Link}
        href="/projects"
        size={40}
        radius="md"
        variant={pathname === '/projects' ? 'light' : 'subtle'}
        color={pathname === '/projects' ? 'blue' : 'gray'}
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
      {(projects ?? []).map((project) => {
        const href = `/projects/${project.id}`;
        const percent = project.total ? Math.round((project.studied / project.total) * 100) : 0;
        const progress = project.kind === 'learningPath';
        return (
          // A thin ring around the icon fills with a learning path's progress; a study's stays plain
          <Box
            key={project.id}
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
              color={project.color}
              aria-label={progress ? t('shell.rail.pathProgress', { title: project.title, percent }) : project.title}
            >
              <PageGlyph icon={project.icon} size={19} />
            </ActionIcon>
          </Box>
        );
      })}
      <Avatar mt="auto" radius="xl" color="blue" variant="filled" name={user?.displayName} aria-hidden="true" />
    </Stack>
  );
}

/** Logo, navigation, the learner's maps, and their account at the bottom */
function Sidebar({ sidebarAction }: { sidebarAction: ReactNode }) {
  const pathname = usePathname();
  const projects = useProjects();
  const inboxCount = useInboxCount();
  const t = useT();

  return (
    <>
      <AppShell.Section px="lg" pt="lg" pb="md">
        <Group justify="space-between" wrap="nowrap">
          <Anchor component={Link} href="/projects" underline="never" c="inherit">
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
          href="/projects"
          label={t('shell.sidebar.myPaths')}
          active={pathname === '/projects'}
          leftSection={<IconHome size={20} stroke={1.7} />}
          rightSection={
            projects && projects.length > 0 ? (
              <Badge size="sm" variant="light" circle>
                {projects.length}
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
        {(projects ?? []).map((project) => {
          const { studied, total } = project;
          const href = `/projects/${project.id}`;
          // Only a learning path has a share studied to show
          const progress = project.kind === 'learningPath';
          return (
            <NavLink
              key={project.id}
              component={Link}
              href={href}
              label={project.title}
              active={pathname.startsWith(href)}
              leftSection={
                <ThemeIcon size={30} radius="xl" variant="light" color={project.color}>
                  <PageGlyph icon={project.icon} size={17} />
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

function AccountMenu() {
  const router = useRouter();
  const session = useSession();
  const logout = useLogout();
  const t = useT();
  const { locale, setChoice } = useLocale();
  const saveLocale = useSaveLocale();
  // The two languages, shown in the menu itself when its Language item is opened
  const [languagesOpen, setLanguagesOpen] = useState(false);
  // Changes at once here, and on the account for every other device
  const pick = (next: Locale | null) => {
    setChoice(next);
    void saveLocale(next);
  };
  const user = session.status === 'signedIn' ? session.user : null;

  const onLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <Menu position="top-start" width="target" withinPortal onClose={() => setLanguagesOpen(false)}>
      <Menu.Target>
        {/* Named by what it shows, after the word for it: a label that hid the name would not match what is read on screen */}
        <UnstyledButton className={classes.accountButton}>
          <VisuallyHidden>{t('shell.account.menu')}</VisuallyHidden>
          <Avatar radius="xl" color="blue" variant="filled" name={user?.displayName} aria-hidden="true" />
          <Stack gap={0} miw={0} style={{ flex: 1 }}>
            <Text size="sm" fw={600} truncate>
              {user?.displayName ?? ' '}
            </Text>
            {/* Without a name the display name is already the email */}
            {user && user.displayName !== user.email && (
              <Text size="xs" c="dimmed" truncate>
                {user.email}
              </Text>
            )}
          </Stack>
          <IconSelector size={16} color="var(--mantine-color-dimmed)" />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        {/* The language opens in place, inside this menu: a menu beside it would close as the pointer crossed over */}
        <Menu.Item
          closeMenuOnClick={false}
          onClick={() => setLanguagesOpen((o) => !o)}
          leftSection={<IconLanguage size={16} />}
          rightSection={
            <Group gap={6} wrap="nowrap">
              <Flag locale={locale} size={16} />
              <IconChevronDown size={14} className={classes.languageChevron} data-open={languagesOpen || undefined} aria-hidden />
            </Group>
          }
          aria-expanded={languagesOpen}
        >
          {t('common.language.menu')}
        </Menu.Item>
        <Collapse in={languagesOpen} transitionDuration={160} role="group" aria-label={t('common.language.menu')}>
          {LOCALES.map((option) => {
            const inUse = option === locale;
            const name = LOCALE_NAMES[option];
            return (
              <Menu.Item
                key={option}
                onClick={() => pick(option)}
                leftSection={<Flag locale={option} />}
                rightSection={inUse ? <IconCheck size={14} aria-hidden /> : null}
                // Menu items can't be checked: the one in use says so in its name, and wears a tick
                aria-label={inUse ? t('common.language.current', { name }) : name}
                data-locale-option={option}
                className={classes.languageOption}
              >
                {name}
              </Menu.Item>
            );
          })}
        </Collapse>
        <Menu.Divider role="separator" />
        <Menu.Item leftSection={<IconLogout size={16} />} onClick={onLogout}>
          {t('shell.account.logout')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
