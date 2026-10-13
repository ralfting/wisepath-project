'use client';

import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Center, Stack, Text, Title } from '@mantine/core';
import type { Project } from '@wisepath/domain/projects';
import { useProject } from '@/useCases/projects';
import type { ProjectActions, SaveState } from '@/useCases/projects';

/**
 * ProjectGate
 * Loads a project and renders its children only once it is ready:
 * nothing while loading, the not-found page for an unknown id (or someone
 * else's map), a short message when the API can't be reached.
 */
export function ProjectGate({
  projectId,
  children,
}: {
  projectId: string;
  children: (project: Project, actions: ProjectActions, save: SaveState) => ReactNode;
}) {
  const { state, save, actions } = useProject(projectId);

  if (state.status === 'loading') return null;
  if (state.status === 'notFound') notFound();
  if (state.status === 'unavailable') {
    return (
      <Center component="main" mih="100vh" p="md">
        <Stack gap="sm" align="center" maw={420} ta="center">
          <Title order={1} fz={30}>
            Can&apos;t open this map
          </Title>
          <Text c="dimmed">WisePath can&apos;t be reached right now. Reload the page to try again.</Text>
        </Stack>
      </Center>
    );
  }
  return <>{children(state.project, actions, save)}</>;
}
