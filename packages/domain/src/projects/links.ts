import type { PageId, Project } from './Project';
import { findPageByTitle } from './rules';

/**
 * Levels
 * The project read top-down: level 1 is the start page, level 2 the pages it
 * references with [[Title]] links, level 3 the pages those reference, and so on.
 * Pages the start page never reaches sit apart. The map's force layout uses
 * these depths as gravity (see graph-layout.ts).
 */

const WIKILINK = /\[\[([^[\]\n]+)\]\]/g;

/** Titles referenced with [[Title]] in a page's markdown, outside code */
export function referencedTitles(markdown: string): string[] {
  const withoutCode = markdown.replace(/```[\s\S]*?```|`[^`\n]*`/g, '');
  return Array.from(withoutCode.matchAll(new RegExp(WIKILINK.source, 'g')), (m) => m[1].trim());
}

export interface Reference {
  from: PageId;
  to: PageId;
}

/** Directed references between existing pages (links to missing pages are skipped) */
export function references(project: Project): Reference[] {
  const seen = new Set<string>();
  const out: Reference[] = [];
  for (const page of project.pages) {
    for (const title of referencedTitles(page.content)) {
      const target = findPageByTitle(project.pages, title);
      const key = `${page.id}>${target?.id}`;
      if (!target || target.id === page.id || seen.has(key)) continue;
      seen.add(key);
      out.push({ from: page.id, to: target.id });
    }
  }
  return out;
}

export interface Levels {
  /** Page ids per level, level 1 first */
  levels: PageId[][];
  /** Pages the start page does not reach */
  apart: PageId[];
  levelOf: Map<PageId, number>;
}

/** Breadth-first descent from the start page along references */
export function computeLevels(project: Project): Levels {
  const refs = references(project);
  const levelOf = new Map<PageId, number>();
  const levels: PageId[][] = [];
  const start = project.pages.find((p) => p.id === project.startPageId);

  if (start) {
    let frontier = [start.id];
    levelOf.set(start.id, 1);
    while (frontier.length) {
      levels.push(frontier);
      const next: PageId[] = [];
      for (const id of frontier) {
        for (const ref of refs) {
          if (ref.from === id && !levelOf.has(ref.to)) {
            levelOf.set(ref.to, levels.length + 1);
            next.push(ref.to);
          }
        }
      }
      frontier = next;
    }
  }

  const apart = project.pages.filter((p) => !levelOf.has(p.id)).map((p) => p.id);
  return { levels, apart, levelOf };
}

/** The subject named in "Now I know …": the project's subject, or its title without a leading "Learn" */
export function subjectOf(project: Project): string {
  return project.subject?.trim() || project.title.replace(/^learn(ing)?\s+/i, '').trim() || project.title;
}
