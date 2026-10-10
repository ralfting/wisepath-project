/**
 * Projects Domain Module - Public API
 * Export only what external modules need to consume
 */

// Components
export { ProjectView } from './components/ProjectView';

// Data (sample until the projects API exists)
export { getSampleProject, sampleProject } from './data/sample-project';

// Types (for external consumers)
export type { Project, Page, Connection, Resource } from './types/project.types';
