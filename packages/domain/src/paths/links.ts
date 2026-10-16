import type { PageId, Path } from './Path';
import { findPageByTitle } from './rules';

/**
 * Links
 * [[Title]] references written in a page's markdown: the only way pages
 * connect. Their order in the text sets the order of branches on the map.
 */

const WIKILINK = /\[\[([^[\]\n]+)\]\]/g;

/** Titles referenced with [[Title]] in a page's markdown, outside code, in reading order */
export function referencedTitles(markdown: string): string[] {
  const withoutCode = markdown.replace(/```[\s\S]*?```|`[^`\n]*`/g, '');
  return Array.from(withoutCode.matchAll(new RegExp(WIKILINK.source, 'g')), (m) => m[1].trim());
}

export interface Reference {
  from: PageId;
  to: PageId;
}

/** Pages one page links to, in reading order, once each (links to missing pages are skipped) */
export function linksOf(path: Path, pageId: PageId): PageId[] {
  const page = path.pages.find((p) => p.id === pageId);
  if (!page) return [];
  const out: PageId[] = [];
  for (const title of referencedTitles(page.content)) {
    const target = findPageByTitle(path.pages, title);
    if (target && target.id !== page.id && !out.includes(target.id)) out.push(target.id);
  }
  return out;
}

/** A page's text with a [[Title]] line added at its end, a blank line after what was there */
export function withLinkTo(markdown: string, title: string): string {
  const before = markdown.trimEnd();
  return before ? `${before}\n\n[[${title}]]` : `[[${title}]]`;
}

/** Every link between existing pages */
export function references(path: Path): Reference[] {
  return path.pages.flatMap((page) => linksOf(path, page.id).map((to) => ({ from: page.id, to })));
}
