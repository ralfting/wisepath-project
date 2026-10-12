/**
 * Projects Domain Module - Public API
 * Export only what external modules need to consume
 */

// Components
export { ProjectMap } from './components/ProjectMap';
export { PageEditor } from './components/PageEditor';
export { ProjectsHome } from './components/ProjectsHome';

// Store
export { ProjectStoreProvider } from './hooks/useProjectStore';

// Data (sample until the projects API exists)
export { getSampleProject, sampleProject } from './data/sample-project';

// Types (for external consumers)
export type { Project, Page, Connection } from './types/project.types';
