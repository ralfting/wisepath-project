import type { Page, PageColor, PageIcon, PageId, Path, PathKind } from './Path';

/**
 * Rules
 * Pure changes to a path. Pages connect only through [[Title]] links, so
 * titles stay unique within a path, and a page is created from a link
 * that points at a title no page has yet.
 */

export function wordCount(markdown: string): number {
  const words = markdown
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#>*_`[\]()-]/g, ' ')
    .trim();
  return words ? words.split(/\s+/).length : 0;
}

export function displayTitle(page: Pick<Page, 'title'>): string {
  return page.title.trim() || 'Untitled page';
}

/** A title as typed, made fit to be one: a single line without [ or ], which would end the [[Title]] links to it */
export function asTitle(typed: string): string {
  return typed.replace(/\s*\n+\s*/g, ' ').replace(/[[\]]/g, '');
}

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The page a [[Title]] link points at: case-insensitive, ignoring surrounding spaces */
export function findPageByTitle<T extends Pick<Page, 'title'>>(pages: ReadonlyArray<T>, title: string): T | undefined {
  return title.trim() ? pages.find((p) => sameTitle(p.title, title)) : undefined;
}

/** The title, or "Title (2)", "Title (3)"… when another page has it */
export function freeTitle(pages: ReadonlyArray<Pick<Page, 'title'>>, title: string): string {
  if (!findPageByTitle(pages, title)) return title;
  for (let n = 2; ; n++) {
    const next = `${title} (${n})`;
    if (!findPageByTitle(pages, next)) return next;
  }
}

/** True when another page already uses this title, so [[links]] to it would be ambiguous */
export function titleTaken(path: Path, pageId: PageId, title: string): boolean {
  return !!title.trim() && path.pages.some((p) => p.id !== pageId && sameTitle(p.title, title));
}

/** A new, empty path: just its root page */
export function newPath(id: Path['id'], title: string, rootId: PageId, now = new Date(), kind: PathKind = 'study'): Path {
  const root: Page = { id: rootId, title: title.trim(), content: '', studied: false, updatedAt: now.toISOString() };
  return { id, title: root.title, kind, pages: [root], rootPageId: rootId, visibility: 'private', access: 'owner' };
}

/**
 * Creates the page a [[link]] points to. The link already written in the
 * other page is what connects it. A title that exists returns that page.
 */
export function createPage(path: Path, title: string, id: PageId, now = new Date()): { path: Path; page: Page } {
  const existing = findPageByTitle(path.pages, title);
  if (existing) return { path, page: existing };
  const page: Page = { id, title: title.trim(), content: '', studied: false, updatedAt: now.toISOString() };
  return { path: { ...path, pages: [...path.pages, page] }, page };
}

/**
 * Edits a page. A title another page already has is refused (the path comes
 * back unchanged). The root names the map.
 */
export function updatePage(
  path: Path,
  pageId: PageId,
  patch: Partial<Pick<Page, 'title' | 'content' | 'studied'>>,
  now = new Date(),
): Path {
  if (patch.title !== undefined && titleTaken(path, pageId, patch.title)) return path;
  if (Object.keys(patch).length === 0) return path;
  const pages = path.pages.map((p) => {
    if (p.id !== pageId) return p;
    // Toggling studied is not an edit of the page
    const edited = patch.title !== undefined || patch.content !== undefined;
    return { ...p, ...patch, updatedAt: edited ? now.toISOString() : p.updatedAt };
  });
  const title = pageId === path.rootPageId && patch.title !== undefined ? patch.title : path.title;
  return { ...path, title, pages };
}

/** Shows a page as a module or not, and sets the colour and icon a module or the root shows */
export function setLook(
  path: Path,
  pageId: PageId,
  look: { module?: boolean; color?: PageColor; icon?: PageIcon },
): Path {
  return { ...path, pages: path.pages.map((p) => (p.id === pageId ? { ...p, ...look } : p)) };
}

export function setDescription(path: Path, description: string): Path {
  return { ...path, description };
}

/** Turns a study into a learning path or back; the pages' studied marks stay as they are */
export function setKind(path: Path, kind: PathKind): Path {
  return { ...path, kind };
}

/**
 * Removes one page; the root can't be removed. [[Links]] to it stay in other
 * pages and show as missing, and pages only it reached become orphans.
 */
export function deletePage(path: Path, pageId: PageId): Path {
  if (pageId === path.rootPageId) return path;
  return { ...path, pages: path.pages.filter((p) => p.id !== pageId) };
}

/** A [[Title]] link to this page, any case, as a pattern */
export function linkPattern(title: string): RegExp {
  return new RegExp(`\\[\\[\\s*${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\]\\]`, 'gi');
}

/**
 * Turns [[Title]] links into plain text across the path, for a page about
 * to be deleted: the words stay where they were written, without pointing at
 * a page that is gone. Returns the pages whose text changed.
 */
export function unlinkPages(path: Path, title: string): Page[] {
  const name = title.trim();
  if (!name) return [];
  return path.pages.flatMap((p) => {
    const content = p.content.replace(linkPattern(name), name);
    return content === p.content ? [] : [{ ...p, content }];
  });
}

/** Rewrites [[Old]] links to [[New]] across the path after a page is renamed */
export function renameLinks(path: Path, oldTitle: string, newTitle: string): Path {
  const from = oldTitle.trim();
  const to = newTitle.trim();
  if (!from || !to || from === to) return path;
  return {
    ...path,
    pages: path.pages.map((p) => {
      const content = p.content.replace(linkPattern(from), `[[${to}]]`);
      return content === p.content ? p : { ...p, content };
    }),
  };
}
