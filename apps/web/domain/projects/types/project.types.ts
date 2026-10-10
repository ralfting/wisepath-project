/**
 * Projects Domain Types
 * A project (topic) holds pages (subtopics) of free markdown that link
 * each other with [[Title]]; the links set the map's top-down levels.
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
  /** Legacy position from the free-form chart; the map now places pages by level */
  position: ChartPosition;
  studied: boolean;
  /** ISO date of the last edit */
  updatedAt: string;
}

/** Legacy undirected link from before pages related only through [[links]]; no longer created */
export interface Connection {
  a: string;
  b: string;
}

export interface Project {
  id: string;
  title: string;
  pages: Page[];
  /** Legacy: ignored; pages relate through [[links]] in their markdown */
  connections?: Connection[];
  /** Level 1 of the top-down map; everything descends from it through [[links]] */
  startPageId?: string | null;
  /** What the learner will know at the end, as in "Now I know JavaScript" */
  subject?: string;
  /** True for demonstration content that is not a real user's project */
  isSample?: boolean;
}
