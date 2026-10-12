'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  Anchor,
  AppShell,
  Avatar,
  Badge,
  Breadcrumbs,
  Burger,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronRight, IconHome, IconLogout, IconRoute } from '@tabler/icons-react';
import { lookOf, projectProgress } from '@wisepath/domain/projects';
import { useLogout, useSession } from '@/useCases/auth';
import { useProjects } from '@/useCases/projects';
import { PageGlyph } from '@/features/shared/look';
import classes from './AppFrame.module.css';

/**
 * AppFrame
 * The signed-in layout: a sidebar with the learner's maps and a top bar with
 * breadcrumbs, an optional slot (the map's search) and the account menu.
 */

export interface Crumb {
  label: string;
  href?: string;
}

export function AppFrame({ crumbs, tools, children }: { crumbs: Crumb[]; tools?: ReactNode; children: ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const logout = useLogout();
  const projects = useProjects();
  const user = session.status === 'signedIn' ? session.user : null;

  // A cookie that no longer opens a session: clear it, then log in again
  useEffect(() => {
    if (session.status !== 'signedOut') return;
    logout().finally(() => router.replace('/login'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status]);

  useEffect(close, [pathname, close]);

  const onLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <AppShell navbar={{ width: 264, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding={0}>
      <AppShell.Navbar className={classes.navbar}>
        <AppShell.Section px="lg" pt="lg" pb="md">
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
        </AppShell.Section>

        <AppShell.Section px="sm">
          <NavLink
            component={Link}
            href="/projects"
            label="My maps"
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
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea} px="sm" pt="lg">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.6} px="sm" pb={6}>
            Maps
          </Text>
          {(projects ?? []).map((project) => {
            const look = lookOf(project, project.rootPageId);
            const { studied, total } = projectProgress(project);
            const href = `/projects/${project.id}`;
            return (
              <NavLink
                key={project.id}
                component={Link}
                href={href}
                label={project.title}
                active={pathname.startsWith(href)}
                leftSection={
                  <ThemeIcon size={30} radius="xl" variant="light" color={look.color}>
                    <PageGlyph icon={look.icon} size={17} />
                  </ThemeIcon>
                }
                rightSection={
                  <Text size="sm" c="dimmed">
                    {total ? Math.round((studied / total) * 100) : 0}%
                  </Text>
                }
                className={classes.navLink}
              />
            );
          })}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main className={classes.main}>
        <Group component="header" className={classes.topbar} gap="md" wrap="nowrap">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Open navigation" />
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
          <Group gap="md" ml="auto" wrap="nowrap">
            {tools}
            <Menu position="bottom-end" width={220}>
              <Menu.Target>
                <UnstyledButton aria-label="Account">
                  <Avatar radius="xl" color="blue" variant="filled" name={user?.displayName} />
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                {user && (
                  <Menu.Label>
                    <Text size="sm" fw={600} c="var(--mantine-color-text)" truncate>
                      {user.displayName}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {user.email}
                    </Text>
                  </Menu.Label>
                )}
                <Menu.Item leftSection={<IconLogout size={16} />} onClick={onLogout}>
                  Log out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
