import type { Page, PageId, Path } from './Path';
import { findPageByTitle } from './rules';

/**
 * Links and citations
 * Pages connect through the titles their markdown names. [[Title]] links a page: the path onward, and only links
 * shape the map, their order in the text setting the order of branches. @[[Title]] cites a page: it points at it
 * without placing it.
 */

const REFERENCE = /(@?)\[\[([^[\]\n]+)\]\]/g;

/** How a page names another: a link leads on to it and can place it on the map; a citation only points at it */
export type ConnectionKind = 'link' | 'citation';

/** A [[Title]] or @[[Title]] written in a page */
export interface Reference {
  readonly title: string;
  readonly kind: ConnectionKind;
}

/** A page another one names, under the strongest way it does */
export interface Connection {
  readonly to: PageId;
  readonly kind: ConnectionKind;
}

/** The [[Title]] links and @[[Title]] citations in a page's markdown, outside code, in reading order */
export function references(markdown: string): Reference[] {
  const withoutCode = markdown.replace(/```[\s\S]*?```|`[^`\n]*`/g, '');
  return Array.from(withoutCode.matchAll(new RegExp(REFERENCE.source, 'g')), (m) => ({
    title: m[2].trim(),
    kind: m[1] ? ('citation' as const) : ('link' as const),
  }));
}

/** A text with its [[Title]] links and @[[Title]] citations read as their titles, as a sentence says them */
export function titlesAsWords(text: string): string {
  return text.replace(new RegExp(REFERENCE.source, 'g'), (_, _at: string, title: string) => title.trim());
}

/**
 * The pages one page names, once each, in the reading order of the mention that counts: a page both linked and cited
 * is linked, from where its first link is. Missing pages and the page itself are skipped
 */
export function connectionsOf(path: Path, pageId: PageId): Connection[] {
  const page = path.pages.find((p) => p.id === pageId);
  if (!page) return [];
  const named = references(page.content).flatMap(({ title, kind }) => {
    const target = findPageByTitle(path.pages, title);
    return target && target.id !== page.id ? [{ to: target.id, kind }] : [];
  });
  const linked = new Set(named.filter((n) => n.kind === 'link').map((n) => n.to));
  const out: Connection[] = [];
  for (const n of named) {
    if (n.kind === 'citation' && linked.has(n.to)) continue;
    if (!out.some((c) => c.to === n.to)) out.push(n);
  }
  return out;
}

/** Pages one page links to, in reading order, once each (links to missing pages are skipped) */
export function linksOf(path: Path, pageId: PageId): PageId[] {
  return connectionsOf(path, pageId).flatMap((c) => (c.kind === 'link' ? [c.to] : []));
}

/** Pages one page cites and does not link, in reading order, once each */
export function citationsOf(path: Path, pageId: PageId): PageId[] {
  return connectionsOf(path, pageId).flatMap((c) => (c.kind === 'citation' ? [c.to] : []));
}

/**
 * Titles a page links to that no page has yet, in reading order, once each (folded like titles are compared): the
 * pages the learner has named but not made. The map shows them so writing [[Title]] visibly adds something; citing a
 * missing page adds nothing to the map
 */
export function pendingTitles(path: Path, pageId: PageId): string[] {
  const page = path.pages.find((p) => p.id === pageId);
  if (!page) return [];
  const out: string[] = [];
  for (const { title, kind } of references(page.content)) {
    if (kind !== 'link' || !title || findPageByTitle(path.pages, title)) continue;
    if (!out.some((t) => t.toLowerCase() === title.toLowerCase())) out.push(title);
  }
  return out;
}

/** A page's text with a [[Title]] line added at its end, a blank line after what was there */
export function withLinkTo(markdown: string, title: string): string {
  const before = markdown.trimEnd();
  return before ? `${before}\n\n[[${title}]]` : `[[${title}]]`;
}

/** Every link and citation between existing pages */
export function connections(path: Path): Array<Connection & { readonly from: PageId }> {
  return path.pages.flatMap((page) => connectionsOf(path, page.id).map((c) => ({ from: page.id, ...c })));
}

/** The pages that cite this one without linking it, in the path's order */
export function citingPages(path: Path, pageId: PageId): Page[] {
  return path.pages.filter((p) => citationsOf(path, p.id).includes(pageId));
}
