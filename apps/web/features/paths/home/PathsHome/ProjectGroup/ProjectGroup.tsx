'use client';

import { ActionIcon, Badge, Group, Menu, SimpleGrid, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconDots, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import type { PathSummary } from '@wisepath/domain/paths';
import type { Project } from '@wisepath/domain/projects';
import { ProjectNameModal } from '../ProjectNameModal/ProjectNameModal';
import { DeleteProjectModal } from '../DeleteProjectModal';
import { useT } from '@/i18n/I18nProvider';
import classes from '../PathsHome.module.css';
import { PathCard } from '../PathCard';
import { useProjectGroup } from './useProjectGroup';

/** One project's paths, under its name, with its own New path and its menu */
export function ProjectGroup({
  project,
  paths,
  projects,
  fallback,
  onNewPath,
  dragging,
  onDrag,
  onMove,
}: {
  project: Project;
  paths: ReadonlyArray<PathSummary>;
  projects: ReadonlyArray<Project>;
  fallback: string;
  onNewPath: () => void;
  /** The card being dragged, from any project */
  dragging: PathSummary | null;
  onDrag: (path: PathSummary | null) => void;
  onMove: (path: PathSummary, to: Project) => void;
}) {
  const t = useT();
  const { state, operations } = useProjectGroup({ project, dragging, onDrag, onMove });

  return (
    <Stack
      gap="md"
      component="section"
      aria-label={project.name}
      className={classes.group}
      data-accepts={state.accepts || undefined}
      data-over={state.over || undefined}
      onDragOver={operations.dragOver}
      onDragLeave={operations.dragLeave}
      onDrop={operations.drop}
    >
      <Group gap="sm" wrap="nowrap">
        <Title order={2} fz={20} lineClamp={1}>
          {project.name}
        </Title>
        {project.isDefault && (
          <Tooltip label={t('home.project.defaultHint')} multiline w={260} withArrow>
            <Badge variant="light" color="gray" size="sm" style={{ flexShrink: 0 }}>
              {t('home.project.default')}
            </Badge>
          </Tooltip>
        )}
        {/* An empty project says so below */}
        {paths.length > 0 && (
          <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
            {t('home.project.paths', { count: paths.length })}
          </Text>
        )}
        <Group gap={4} ml="auto" wrap="nowrap">
          <Tooltip label={t('home.project.newPath', { name: project.name })} withArrow>
            <ActionIcon variant="subtle" color="gray" aria-label={t('home.project.newPath', { name: project.name })} onClick={onNewPath}>
              <IconPlus size={18} />
            </ActionIcon>
          </Tooltip>
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={t('home.project.more', { name: project.name })}>
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPencil size={15} />} onClick={operations.rename}>
                {t('home.project.rename')}
              </Menu.Item>
              {/* The default project takes the paths of deleted ones, so it stays */}
              {!project.isDefault && (
                <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={operations.remove}>
                  {t('home.project.delete')}
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
      {paths.length === 0 ? (
        <Text c="dimmed" size="sm">
          {t('home.project.empty')}
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {paths.map((path) => (
            <PathCard key={path.id} path={path} owned={{ projects, dragging: dragging?.id === path.id, onDrag, onMove }} />
          ))}
        </SimpleGrid>
      )}
      <ProjectNameModal opened={state.renaming} project={project} onClose={operations.stopRenaming} />
      {!project.isDefault && (
        <DeleteProjectModal opened={state.deleting} project={project} paths={paths.length} fallback={fallback} onClose={operations.stopRemoving} />
      )}
    </Stack>
  );
}
