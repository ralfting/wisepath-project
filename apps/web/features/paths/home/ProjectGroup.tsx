'use client';

import { useState } from 'react';
import type { DragEvent } from 'react';
import { ActionIcon, Badge, Group, Menu, SimpleGrid, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconDots, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import type { PathSummary } from '@wisepath/domain/paths';
import type { Project } from '@wisepath/domain/projects';
import { DeleteProjectModal, ProjectNameModal } from './ProjectModals';
import { useT } from '@/i18n/I18nProvider';
import classes from './PathsHome.module.css';
import { PathCard } from './PathCard';

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
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [over, setOver] = useState(false);
  // A card from another project can be dropped here
  const accepts = dragging !== null && dragging.projectId !== project.id;

  const onDragOver = (event: DragEvent) => {
    if (!accepts) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setOver(true);
  };
  const onDragLeave = (event: DragEvent) => {
    // Leaving for a child of the group is still over it
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    if (accepts) onMove(dragging, project);
    onDrag(null);
  };

  return (
    <Stack
      gap="md"
      component="section"
      aria-label={project.name}
      className={classes.group}
      data-accepts={accepts || undefined}
      data-over={(accepts && over) || undefined}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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
              <Menu.Item leftSection={<IconPencil size={15} />} onClick={() => setRenaming(true)}>
                {t('home.project.rename')}
              </Menu.Item>
              {/* The default project takes the paths of deleted ones, so it stays */}
              {!project.isDefault && (
                <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => setDeleting(true)}>
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
            <PathCard key={path.id} path={path} projects={projects} dragging={dragging?.id === path.id} onDrag={onDrag} onMove={onMove} />
          ))}
        </SimpleGrid>
      )}
      <ProjectNameModal opened={renaming} project={project} onClose={() => setRenaming(false)} />
      {!project.isDefault && (
        <DeleteProjectModal opened={deleting} project={project} paths={paths.length} fallback={fallback} onClose={() => setDeleting(false)} />
      )}
    </Stack>
  );
}
