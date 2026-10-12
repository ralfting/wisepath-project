'use client';

import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Center, Stack, Text, Title } from '@mantine/core';
import type { Project } from '@wisepath/domain/projects';
import { useProject } from '@/useCases/projects';
import type { ProjectActions } from '@/useCases/projects';

/**
 * ProjectGate
 * Loads a project and renders its children only once it is ready:
 * nothing while loading, the not-found page for an unknown id, a short
 * message when the device storage can't be read.
 */
export function ProjectGate({
  projectId,
  children,
}: {
  projectId: string;
  children: (project: Project, actions: ProjectActions) => ReactNode;
}) {
  const { state, actions } = useProject(projectId);

  if (state.status === 'loading') return null;
  if (state.status === 'notFound') notFound();
  if (state.status === 'unavailable') {
    return (
      <Center component="main" mih="100vh" p="md">
        <Stack gap="sm" align="center" maw={420} ta="center">
          <Title order={1} fz={30}>
            Can&apos;t open this project
          </Title>
          <Text c="dimmed">Its pages couldn&apos;t be read from this device. Reload the page to try again.</Text>
        </Stack>
      </Center>
    );
  }
  return <>{children(state.project, actions)}</>;
}
