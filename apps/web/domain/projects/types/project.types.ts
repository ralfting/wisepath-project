/**
 * Projects Domain Types
 * A project (topic) holds pages (subtopics) of free markdown,
 * linked by undirected connections between related pages.
 */

/** Position on the project chart, in chart units */
export interface ChartPosition {
  x: number;
  y: number;
}

export interface Page {
  id: string;
  title: string;
  /** Free-form markdown: explanations, notes, links, YouTube URLs on their own line */
  content: string;
  position: ChartPosition;
  studied: boolean;
  /** ISO date of the last edit */
  updatedAt: string;
}

/** An undirected link between two related pages; `a` sorts before `b` */
export interface Connection {
  a: string;
  b: string;
}

export interface Project {
  id: string;
  title: string;
  pages: Page[];
  connections: Connection[];
  /** Level 1 of the top-down map; everything descends from it through [[links]] */
  startPageId?: string | null;
  /** What the learner will know at the end, as in "Now I know JavaScript" */
  subject?: string;
  /** True for demonstration content that is not a real user's project */
  isSample?: boolean;
}
