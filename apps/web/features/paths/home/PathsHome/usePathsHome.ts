'use client';

import { useState } from 'react';
import type { PathSummary } from '@wisepath/domain/paths';
import type { Project } from '@wisepath/domain/projects';
import { useMovePath, usePaths } from '@/useCases/paths';
import { useProjects } from '@/useCases/projects';
import { showToast } from '@/features/inbox/capture';
import { useT } from '@/i18n/I18nProvider';
import { defaultProject, fromOthers, groupPaths } from './PathsHome.helpers';

/**
 * The paths page's view model: the learner's paths grouped by project and filtered by the search, those from others
 * apart, the new path
 * and new project dialogs, and moving a path to another project by dragging its card (with Undo)
 */
export function usePathsHome() {
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

  const fallback = projects ? defaultProject(projects) : undefined;
  return {
    state: {
      loaded: paths !== null && projects !== null,
      hasPaths: (paths?.length ?? 0) > 0,
      projects,
      fallback,
      query,
      searching: query.trim() !== '',
      groups: paths && projects ? groupPaths(paths, projects, query) : [],
      others: paths ? fromOthers(paths, query) : [],
      creatingIn,
      newProject,
      dragging,
    },
    operations: {
      setQuery,
      clearQuery: () => setQuery(''),
      newPathIn: (projectId: string) => setCreatingIn(projectId),
      closeNewPath: () => setCreatingIn(null),
      openNewProject: () => setNewProject(true),
      closeNewProject: () => setNewProject(false),
      setDragging,
      move,
    },
  };
}
