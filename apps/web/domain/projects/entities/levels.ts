import type { ChartPosition, Page, Project } from '../types/project.types';
import { findPageByTitle } from './project.entity';

/**
 * Levels
 * The project read top-down: level 1 is the start page, level 2 the pages it
 * references with [[Title]] links, level 3 the pages those reference, and so on.
 * Pages the start page never reaches sit apart, beside the descent.
 */

const WIKILINK = /\[\[([^[\]\n]+)\]\]/g;

/** Titles referenced with [[Title]] in a page's markdown, outside code */
export function referencedTitles(markdown: string): string[] {
  const withoutCode = markdown.replace(/```[\s\S]*?```|`[^`\n]*`/g, '');
  return Array.from(withoutCode.matchAll(new RegExp(WIKILINK.source, 'g')), (m) => m[1].trim());
}

export interface Reference {
  from: string;
  to: string;
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
  levels: string[][];
  /** Pages the start page does not reach */
  apart: string[];
  levelOf: Map<string, number>;
}

/** Breadth-first descent from the start page along references */
export function computeLevels(project: Project): Levels {
  const refs = references(project);
  const levelOf = new Map<string, number>();
  const levels: string[][] = [];
  const start = project.pages.find((p) => p.id === project.startPageId);

  if (start) {
    let frontier = [start.id];
    levelOf.set(start.id, 1);
    while (frontier.length) {
      levels.push(frontier);
      const next: string[] = [];
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

export const LEVEL_GAP = 150;
export const SLOT_GAP = 150;
const APART_GAP = 80;

export interface LevelLayout extends Levels {
  positions: Map<string, ChartPosition>;
  /** Half the width of the widest level, in chart units */
  halfWidth: number;
  /** x of the column of pages set apart */
  apartX: number;
  /** y where the destination constellation sits */
  destinationY: number;
}

/**
 * Places each level on its own row, centred, ordering pages under the pages
 * that reference them to keep lines short. Pages set apart stack in a column
 * to the right.
 */
export function layoutLevels(project: Project): LevelLayout {
  const levels = computeLevels(project);
  const refs = references(project);
  const positions = new Map<string, ChartPosition>();
  const byId = new Map(project.pages.map((p) => [p.id, p]));
  const title = (id: string) => (byId.get(id) as Page).title.toLowerCase();

  let halfWidth = 0;
  levels.levels.forEach((ids, i) => {
    // Order by the average x of the pages above that reference each one
    const parentX = (id: string) => {
      const xs = refs.filter((r) => r.to === id && positions.has(r.from)).map((r) => positions.get(r.from)!.x);
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    };
    const ordered = [...ids].sort((a, b) => parentX(a) - parentX(b) || title(a).localeCompare(title(b)));
    const width = (ordered.length - 1) * SLOT_GAP;
    halfWidth = Math.max(halfWidth, width / 2);
    ordered.forEach((id, j) => positions.set(id, { x: j * SLOT_GAP - width / 2, y: i * LEVEL_GAP }));
  });

  const apartX = halfWidth + SLOT_GAP * 1.6;
  levels.apart.forEach((id, j) => positions.set(id, { x: apartX, y: j * APART_GAP }));

  const destinationY = Math.max(levels.levels.length, 1) * LEVEL_GAP + 40;
  return { ...levels, positions, halfWidth, apartX, destinationY };
}

/** The subject named in "Now I know …": the project's subject, or its title without a leading "Learn" */
export function subjectOf(project: Project): string {
  return project.subject?.trim() || project.title.replace(/^learn(ing)?\s+/i, '').trim() || project.title;
}
