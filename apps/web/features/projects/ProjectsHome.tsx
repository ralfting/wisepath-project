'use client';

import Link from 'next/link';
import { Badge, Button, Card, Group, Progress, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconPlayerPlayFilled } from '@tabler/icons-react';
import type { Project } from '@wisepath/domain/projects';
import { lookOf, nextTopic, projectProgress, structureOf } from '@wisepath/domain/projects';
import { useProjects } from '@/useCases/projects';
import { AppFrame } from '@/features/shell/AppFrame';
import { PageGlyph } from '@/features/shared/look';
import classes from './ProjectsHome.module.css';

/**
 * ProjectsHome
 * Where a logged-in learner lands: one card per map with its progress and the
 * way back to where they stopped.
 */
export function ProjectsHome() {
  // Projects live on this device until the projects API exists
  const projects = useProjects();

  return (
    <AppFrame crumbs={[{ label: 'My maps' }]}>
      <Stack gap="xl" px={{ base: 'md', sm: 'xl' }} pb="xl" maw={1200}>
        <Stack gap={4}>
          <Title order={1} fz={34} lts={-0.6}>
            My maps
          </Title>
          <Text c="dimmed">Each map is a subject you are learning: modules around it, topics in each module.</Text>
        </Stack>

        {projects === null ? null : projects.length === 0 ? (
          <Text c="dimmed">No maps yet.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </AppFrame>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const look = lookOf(project, project.rootPageId);
  const { studied, total } = projectProgress(project);
  const modules = structureOf(project).modules.length;
  const next = nextTopic(project);
  const href = `/projects/${project.id}`;

  return (
    <Card padding="lg" className={classes.card}>
      <Stack gap="md" h="100%">
        <Group gap="md" wrap="nowrap">
          <ThemeIcon size={52} radius="xl" variant="light" color={look.color}>
            <PageGlyph icon={look.icon} size={27} />
          </ThemeIcon>
          <Stack gap={0} miw={0}>
            <Group gap="xs" wrap="nowrap">
              <Text component={Link} href={href} fw={800} fz={20} className={classes.title} truncate>
                {project.title}
              </Text>
              {project.isSample && (
                <Badge variant="light" color="gray" radius="sm" size="sm">
                  Sample
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              {modules} {modules === 1 ? 'module' : 'modules'} · {total} {total === 1 ? 'topic' : 'topics'}
            </Text>
          </Stack>
        </Group>
        {project.description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {project.description}
          </Text>
        )}
        <Stack gap={6} mt="auto">
          <Group gap="sm" wrap="nowrap">
            <Progress value={total ? (studied / total) * 100 : 0} size="md" style={{ flex: 1 }} classNames={{ section: classes.progress }} aria-label={`Progress in ${project.title}`} />
            <Text fw={700} size="sm">
              {total ? Math.round((studied / total) * 100) : 0}%
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {studied} of {total} topics studied
          </Text>
        </Stack>
        <Button
          component={Link}
          href={next ? `${href}?page=${next.id}` : href}
          leftSection={next ? <IconPlayerPlayFilled size={14} /> : undefined}
          variant={next ? 'filled' : 'light'}
          className={classes.action}
        >
          {next ? 'Continue studying' : 'Open map'}
        </Button>
      </Stack>
    </Card>
  );
}
