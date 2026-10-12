import type { PageId, Project } from './Project';
import { findPageByTitle } from './rules';

/**
 * Links
 * [[Title]] references written in a page's markdown. Any page can reference
 * any other; the ones that are not already parent and child are the map's
 * cross references.
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

/** References that are not the tree's own parent–child lines, one per pair of pages */
export function crossReferences(project: Project): Reference[] {
  const parentOf = new Map(project.pages.map((p) => [p.id, p.parentId ?? null]));
  const pairs = new Set<string>();
  return references(project).filter(({ from, to }) => {
    if (parentOf.get(from) === to || parentOf.get(to) === from) return false;
    const pair = from < to ? `${from}|${to}` : `${to}|${from}`;
    if (pairs.has(pair)) return false;
    pairs.add(pair);
    return true;
  });
}
