'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import type { Project } from '@wisepath/domain/projects';
import { countStudied } from '@wisepath/domain/projects';
import { references, subjectOf } from '@wisepath/domain/projects';
import { layoutGraph } from '@/features/map/graphLayout';
import { Anchor, Box, Button, Container, Group, Progress, Stack, Text, Title } from '@mantine/core';
import { useLogout, useSession } from '@/useCases/auth';
import { useProjects } from '@/useCases/projects';
import classes from './ProjectsHome.module.css';

/**
 * ProjectsHome
 * Where a logged-in learner lands: their projects, each with a small chart
 * of its pages, how far they have studied, and the way into its map.
 */

const dateFormat = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });

export function ProjectsHome() {
  const router = useRouter();
  const session = useSession();
  const logout = useLogout();
  const user = session.status === 'signedIn' ? session.user : null;
  // Projects live on this device until the projects API exists
  const projects = useProjects();

  // A cookie that no longer opens a session: clear it, then log in again
  useEffect(() => {
    if (session.status !== 'signedOut') return;
    logout().finally(() => router.replace('/login'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status]);

  const onLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <Box mih="100vh">
      <Group component="header" className={classes.header} px={{ base: 'md', sm: 'lg' }} gap="md">
        <Anchor component={Link} href="/projects" fw={700} fz={17} c="inherit" underline="never">
          WisePath
        </Anchor>
        <Group ml="auto" gap="md">
          {user && (
            <Text size="sm" c="dimmed" visibleFrom="sm">
              {user.displayName}
            </Text>
          )}
          <Button variant="default" onClick={onLogout}>
            Log out
          </Button>
        </Group>
      </Group>

      <Container component="main" size="md" pt={40} pb={64}>
        <Title order={1} fz={34}>
          Your projects
        </Title>
        <Text c="dimmed" mt="xs">
          Each project is a subject you are learning, mapped page by page.
        </Text>

        {projects === null ? null : projects.length === 0 ? (
          <Text c="dimmed" mt={40}>
            No projects yet.
          </Text>
        ) : (
          <Stack component="ul" gap="md" mt="xl" p={0} style={{ listStyle: 'none' }}>
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectRow project={project} />
              </li>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}

function ProjectRow({ project }: { project: Project }) {
  const total = project.pages.length;
  const studied = countStudied(project);
  const lastEdit = project.pages.reduce<string | null>((latest, p) => (!latest || p.updatedAt > latest ? p.updatedAt : latest), null);
  const start = project.pages.find((p) => p.id === project.startPageId);

  return (
    <Link href={`/projects/${project.id}`} className={classes.row}>
      <MiniChart project={project} />
      <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
        <Group gap="sm" align="baseline">
          <Title order={2} fz={24} className={classes.title}>
            {project.title}
          </Title>
          {project.isSample && (
            <Text size="xs" c="dimmed">
              Sample project
            </Text>
          )}
        </Group>
        <Text size="sm" c="dimmed">
          {total} {total === 1 ? 'page' : 'pages'}
          {start ? `, starting from ${start.title}` : ''}.
          {lastEdit ? ` Last edited ${dateFormat.format(new Date(lastEdit))}.` : ''}
        </Text>
        <Stack gap={6} pt={4}>
          <Progress
            value={total ? (studied / total) * 100 : 0}
            size="sm"
            maw={320}
            aria-label={`Pages studied in ${project.title}`}
          />
          <Text size="xs" c="dimmed">
            <Text span fw={700} c="var(--mantine-color-text)">
              {studied}
            </Text>{' '}
            of {total} studied toward knowing {subjectOf(project)}
          </Text>
        </Stack>
      </Stack>
    </Link>
  );
}

/** The project's chart in miniature: the same downward graph, without names */
function MiniChart({ project }: { project: Project }) {
  const W = 220;
  const H = 136;
  const { dots, lines } = useMemo(() => {
    const { positions } = layoutGraph(project);
    const pts = Array.from(positions.values());
    if (!pts.length) return { dots: [], lines: [] };
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    const scale = Math.min((W - 24) / Math.max(maxX - minX, 1), (H - 24) / Math.max(maxY - minY, 1));
    const ox = (W - (maxX - minX) * scale) / 2;
    const oy = (H - (maxY - minY) * scale) / 2;
    const at = (id: string) => {
      const p = positions.get(id) ?? { x: minX, y: minY };
      return { x: ox + (p.x - minX) * scale, y: oy + (p.y - minY) * scale };
    };
    return {
      dots: project.pages.map((p) => ({ id: p.id, studied: p.studied, ...at(p.id) })),
      lines: references(project).map((r) => ({ key: `${r.from}-${r.to}`, a: at(r.from), b: at(r.to) })),
    };
  }, [project]);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className={classes.mini}
    >
      {lines.map(({ key, a, b }) => (
        <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--mantine-color-atlas-3)" strokeWidth={0.8} opacity={0.7} />
      ))}
      {dots.map((d) =>
        d.studied ? (
          <circle key={d.id} cx={d.x} cy={d.y} r={2.6} fill="var(--mantine-color-atlas-0)" />
        ) : (
          <circle
            key={d.id}
            cx={d.x}
            cy={d.y}
            r={2.2}
            fill="var(--mantine-color-atlas-7)"
            stroke="var(--mantine-color-atlas-2)"
            strokeWidth={1}
          />
        ),
      )}
    </svg>
  );
}
