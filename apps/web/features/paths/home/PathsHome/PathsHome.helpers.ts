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
 * default project. While searching, a project with nothing matching is left out. Paths from others are in no
 * project of the learner's: they have their own group (fromOthers).
 */
export function groupPaths(paths: ReadonlyArray<PathSummary>, projects: ReadonlyArray<Project>, query: string): ReadonlyArray<ProjectPaths> {
  const needle = query.trim().toLowerCase();
  const shown = matching(paths, query).filter((p) => p.projectId !== null);
  const fallback = defaultProject(projects);
  const inProject = (project: Project) =>
    shown.filter((p) => p.projectId === project.id || (project === fallback && !projects.some((q) => q.id === p.projectId)));
  const groups = projects.map((project) => ({ project, paths: inProject(project) }));
  return needle ? groups.filter((g) => g.paths.length > 0) : groups;
}

/** Paths shared with the learner or taken by them, that match the search, as listed */
export const fromOthers = (paths: ReadonlyArray<PathSummary>, query: string): ReadonlyArray<PathSummary> =>
  matching(paths, query).filter((p) => p.projectId === null);

/** Paths whose title or description has what is typed, ignoring case and the spaces around it */
const matching = (paths: ReadonlyArray<PathSummary>, query: string) => {
  const needle = query.trim().toLowerCase();
  return paths.filter((p) => !needle || p.title.toLowerCase().includes(needle) || p.description?.toLowerCase().includes(needle));
};

/** The project new paths go into: the default one, or the first when none is marked */
export const defaultProject = (projects: ReadonlyArray<Project>): Project | undefined => projects.find((p) => p.isDefault) ?? projects[0];
