'use client';

import { ActionIcon, Badge, Collapse, Group, Menu, SimpleGrid, Stack, Text, Title, Tooltip, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconDots, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import type { PathSummary } from '@wisepath/domain/paths';
import type { Project } from '@wisepath/domain/projects';
import { ProjectNameModal } from '../ProjectNameModal/ProjectNameModal';
import { DeleteProjectModal } from '../DeleteProjectModal';
import { useT } from '@/i18n/I18nProvider';
import classes from '../PathsHome.module.css';
import { PathCard } from '../PathCard';
import { useProjectGroup } from './useProjectGroup';

/** One project's paths, under its name, with its own New path and its menu, folding away; `bare`, just the paths */
export function ProjectGroup({
  project,
  paths,
  projects,
  fallback,
  bare,
  collapsed,
  onToggle,
  onNewPath,
  dragging,
  onDrag,
  onMove,
}: {
  project: Project;
  paths: ReadonlyArray<PathSummary>;
  projects: ReadonlyArray<Project>;
  fallback: string;
  /** The learner's only project: no header to name a group of one */
  bare: boolean;
  /** Folded: only its header shows */
  collapsed: boolean;
  onToggle: () => void;
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
      {/* A learner with one project sees their paths, not a group: the header comes with the second project */}
      {!bare && (
        <Group gap="sm" wrap="nowrap">
          {/* The heading holds the button, as a disclosure does: a heading may not sit inside a button */}
          <Title order={2} fz={20} miw={0}>
            <UnstyledButton
              onClick={onToggle}
              aria-expanded={!collapsed}
              aria-controls={`project-${project.id}`}
              title={t(collapsed ? 'home.project.expand' : 'home.project.collapse', { name: project.name })}
              className={classes.groupToggle}
            >
              <IconChevronDown size={18} className={classes.groupChevron} data-collapsed={collapsed || undefined} aria-hidden />
              <Text span inherit lineClamp={1}>
                {project.name}
              </Text>
            </UnstyledButton>
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
      )}
      <Collapse in={bare || !collapsed} id={`project-${project.id}`}>
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
      </Collapse>
      <ProjectNameModal opened={state.renaming} project={project} onClose={operations.stopRenaming} />
      {!project.isDefault && (
        <DeleteProjectModal opened={state.deleting} project={project} paths={paths.length} fallback={fallback} onClose={operations.stopRemoving} />
      )}
    </Stack>
  );
}
