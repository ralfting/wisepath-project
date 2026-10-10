/**
 * Projects Domain Types
 * A project (topic) holds pages (subtopics) connected as a graph.
 */

export type ResourceKind = 'video' | 'article' | 'book' | 'note';

export interface Resource {
  id: string;
  title: string;
  kind: ResourceKind;
  url?: string;
  /** Free-form detail shown next to the kind, e.g. "26 min" */
  detail?: string;
}

/** Position on the project chart, in chart units. x grows with learning order. */
export interface ChartPosition {
  x: number;
  y: number;
}

export interface Page {
  id: string;
  title: string;
  description: string;
  resources: Resource[];
  position: ChartPosition;
  /** ISO date when the page was marked studied, or null */
  studiedAt: string | null;
}

/** A directed connection: `from` is studied before `to` */
export interface Connection {
  from: string;
  to: string;
}

export interface Project {
  id: string;
  title: string;
  pages: Page[];
  connections: Connection[];
  /** True for demonstration content that is not a real user's project */
  isSample?: boolean;
}
