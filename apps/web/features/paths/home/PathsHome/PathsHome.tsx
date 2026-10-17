'use client';

import { useState } from 'react';
import { Button, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconFolderPlus, IconPlus, IconSearch } from '@tabler/icons-react';
import type { PathSummary } from '@wisepath/domain/paths';
import type { Project } from '@wisepath/domain/projects';
import { useMovePath, usePaths } from '@/useCases/paths';
import { useProjects } from '@/useCases/projects';
import { ProjectNameModal } from './ProjectNameModal/ProjectNameModal';
import { showToast } from '@/features/inbox/capture';
import { AppFrame } from '@/features/shell';
import { useT } from '@/i18n/I18nProvider';
import { NewMapModal } from './NewMapModal/NewMapModal';
import { ProjectGroup } from './ProjectGroup';

/**
 * PathsHome
 * Where a logged-in learner lands: their paths, one group per project (the
 * default project first, then by name). One card per map (a learning path with
 * its progress and the way back to where they stopped; a study with its size),
 * a search over them, ways to start a map or a project, and each one's menu.
 */
export function PathsHome() {
  const paths = usePaths();
  const projects = useProjects();
  const t = useT();
  // The project a new path starts in; null while the dialog is closed
  const [creatingIn, setCreatingIn] = useState<string | null>(null);
  const [newProject, setNewProject] = useState(false);
  const [query, setQuery] = useState('');
  // The card being dragged to another project, if any
  const [dragging, setDragging] = useState<PathSummary | null>(null);
  const movePath = useMovePath();

  /** Files a path in another project: shown there at once, back where it was if that fails; Undo moves it back */
  const move = async (path: PathSummary, to: Project) => {
    if (path.projectId === to.id) return;
    const from = projects?.find((p) => p.id === path.projectId);
    const failed = await movePath(path.id, to.id);
    showToast({
      text: failed ? `${t('home.card.moveFailed', { title: path.title })} ${failed}` : t('home.card.moved', { title: path.title, project: to.name }),
      ...(!failed && from ? { action: { label: t('home.card.undo'), onClick: () => void move({ ...path, projectId: to.id }, from) } } : {}),
    });
  };

  const needle = query.trim().toLowerCase();
  const shown = (paths ?? []).filter(
    (p) => !needle || p.title.toLowerCase().includes(needle) || p.description?.toLowerCase().includes(needle),
  );
  const fallback = projects?.find((p) => p.isDefault) ?? projects?.[0];
  // A path whose project isn't listed (just deleted elsewhere) shows with the default
  const inProject = (project: Project) =>
    shown.filter((p) => p.projectId === project.id || (project === fallback && !projects?.some((q) => q.id === p.projectId)));
  const groups = (projects ?? []).map((project) => ({ project, paths: inProject(project) }));
  // While searching, a project with nothing matching is left out
  const visible = needle ? groups.filter((g) => g.paths.length > 0) : groups;

  return (
    <AppFrame crumbs={[{ label: t('home.title') }]}>
      <Stack gap="xl" px={{ base: 'md', sm: 'xl' }} pb="xl" maw={1200}>
        <Group justify="space-between" align="flex-end" gap="md">
          <Stack gap={4}>
            <Title order={1} fz={34} lts={-0.6}>
              {t('home.title')}
            </Title>
            <Text c="dimmed">{t('home.intro')}</Text>
          </Stack>
          <Group gap="sm" wrap="nowrap">
            {paths && paths.length > 0 && (
              <TextInput
                type="search"
                placeholder={t('home.search')}
                aria-label={t('home.search')}
                leftSection={<IconSearch size={16} />}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
                w={{ base: '100%', xs: 240 }}
              />
            )}
            <Button variant="default" leftSection={<IconFolderPlus size={16} />} onClick={() => setNewProject(true)} style={{ flexShrink: 0 }}>
              {t('home.newProject')}
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => fallback && setCreatingIn(fallback.id)}
              disabled={!fallback}
              style={{ flexShrink: 0 }}
            >
              {t('home.newPath')}
            </Button>
          </Group>
        </Group>

        {paths === null || projects === null ? null : needle && visible.length === 0 ? (
          <Text c="dimmed">{t('home.noMatch', { query: query.trim() })}</Text>
        ) : (
          visible.map(({ project, paths: inThis }) => (
            <ProjectGroup
              key={project.id}
              project={project}
              paths={inThis}
              projects={projects}
              fallback={fallback?.name ?? ''}
              onNewPath={() => setCreatingIn(project.id)}
              dragging={dragging}
              onDrag={setDragging}
              onMove={move}
            />
          ))
        )}
      </Stack>
      {projects && (
        <NewMapModal opened={creatingIn !== null} projectId={creatingIn} projects={projects} onClose={() => setCreatingIn(null)} />
      )}
      <ProjectNameModal opened={newProject} onClose={() => setNewProject(false)} />
    </AppFrame>
  );
}
