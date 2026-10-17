import type { PathSummary } from '@wisepath/domain/paths';
import type { Project } from '@wisepath/domain/projects';

/** One project's group on the paths page */
export interface ProjectPaths {
  readonly project: Project;
  readonly paths: ReadonlyArray<PathSummary>;
}

/**
 * The paths page's groups: one per project in the order given, each with its paths that match the search (by title
 * or description, ignoring case). A path whose project isn't listed (just deleted elsewhere) shows with the
 * default project. While searching, a project with nothing matching is left out.
 */
export function groupPaths(paths: ReadonlyArray<PathSummary>, projects: ReadonlyArray<Project>, query: string): ReadonlyArray<ProjectPaths> {
  const needle = query.trim().toLowerCase();
  const shown = paths.filter((p) => !needle || p.title.toLowerCase().includes(needle) || p.description?.toLowerCase().includes(needle));
  const fallback = defaultProject(projects);
  const inProject = (project: Project) =>
    shown.filter((p) => p.projectId === project.id || (project === fallback && !projects.some((q) => q.id === p.projectId)));
  const groups = projects.map((project) => ({ project, paths: inProject(project) }));
  return needle ? groups.filter((g) => g.paths.length > 0) : groups;
}

/** The project new paths go into: the default one, or the first when none is marked */
export const defaultProject = (projects: ReadonlyArray<Project>): Project | undefined => projects.find((p) => p.isDefault) ?? projects[0];
