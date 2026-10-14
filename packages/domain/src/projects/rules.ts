import type { Page, PageColor, PageIcon, PageId, Project, ProjectKind } from './Project';

/**
 * Rules
 * Pure changes to a project. Pages connect only through [[Title]] links, so
 * titles stay unique within a project, and a page is created from a link
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

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The page a [[Title]] link points at: case-insensitive, ignoring surrounding spaces */
export function findPageByTitle<T extends Pick<Page, 'title'>>(pages: ReadonlyArray<T>, title: string): T | undefined {
  return title.trim() ? pages.find((p) => sameTitle(p.title, title)) : undefined;
}

/** True when another page already uses this title, so [[links]] to it would be ambiguous */
export function titleTaken(project: Project, pageId: PageId, title: string): boolean {
  return !!title.trim() && project.pages.some((p) => p.id !== pageId && sameTitle(p.title, title));
}

/** A new, empty project: just its root page */
export function newProject(id: Project['id'], title: string, rootId: PageId, now = new Date(), kind: ProjectKind = 'study'): Project {
  const root: Page = { id: rootId, title: title.trim(), content: '', studied: false, updatedAt: now.toISOString() };
  return { id, title: root.title, kind, pages: [root], rootPageId: rootId };
}

/**
 * Creates the page a [[link]] points to. The link already written in the
 * other page is what connects it. A title that exists returns that page.
 */
export function createPage(project: Project, title: string, id: PageId, now = new Date()): { project: Project; page: Page } {
  const existing = findPageByTitle(project.pages, title);
  if (existing) return { project, page: existing };
  const page: Page = { id, title: title.trim(), content: '', studied: false, updatedAt: now.toISOString() };
  return { project: { ...project, pages: [...project.pages, page] }, page };
}

/**
 * Edits a page. A title another page already has is refused (the project comes
 * back unchanged), and the root can't be marked studied. The root names the map.
 */
export function updatePage(
  project: Project,
  pageId: PageId,
  patch: Partial<Pick<Page, 'title' | 'content' | 'studied'>>,
  now = new Date(),
): Project {
  if (patch.title !== undefined && titleTaken(project, pageId, patch.title)) return project;
  const isRoot = pageId === project.rootPageId;
  const { studied: _studied, ...rest } = patch;
  const applied = isRoot ? rest : patch;
  if (Object.keys(applied).length === 0) return project;
  const pages = project.pages.map((p) => {
    if (p.id !== pageId) return p;
    // Toggling studied is not an edit of the page
    const edited = patch.title !== undefined || patch.content !== undefined;
    return { ...p, ...applied, updatedAt: edited ? now.toISOString() : p.updatedAt };
  });
  const title = isRoot && patch.title !== undefined ? patch.title : project.title;
  return { ...project, title, pages };
}

/** Shows a page as a module or not, and sets the colour and icon a module or the root shows */
export function setLook(
  project: Project,
  pageId: PageId,
  look: { module?: boolean; color?: PageColor; icon?: PageIcon },
): Project {
  return { ...project, pages: project.pages.map((p) => (p.id === pageId ? { ...p, ...look } : p)) };
}

export function setDescription(project: Project, description: string): Project {
  return { ...project, description };
}

/** Turns a study into a learning path or back; the pages' studied marks stay as they are */
export function setKind(project: Project, kind: ProjectKind): Project {
  return { ...project, kind };
}

/**
 * Removes one page; the root can't be removed. [[Links]] to it stay in other
 * pages and show as missing, and pages only it reached become orphans.
 */
export function deletePage(project: Project, pageId: PageId): Project {
  if (pageId === project.rootPageId) return project;
  return { ...project, pages: project.pages.filter((p) => p.id !== pageId) };
}

/** A [[Title]] link to this page, any case, as a pattern */
function linkPattern(title: string): RegExp {
  return new RegExp(`\\[\\[\\s*${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\]\\]`, 'gi');
}

/**
 * Turns [[Title]] links into plain text across the project, for a page about
 * to be deleted: the words stay where they were written, without pointing at
 * a page that is gone. Returns the pages whose text changed.
 */
export function unlinkPages(project: Project, title: string): Page[] {
  const name = title.trim();
  if (!name) return [];
  return project.pages.flatMap((p) => {
    const content = p.content.replace(linkPattern(name), name);
    return content === p.content ? [] : [{ ...p, content }];
  });
}

/** Rewrites [[Old]] links to [[New]] across the project after a page is renamed */
export function renameLinks(project: Project, oldTitle: string, newTitle: string): Project {
  const from = oldTitle.trim();
  const to = newTitle.trim();
  if (!from || !to || from === to) return project;
  return {
    ...project,
    pages: project.pages.map((p) => {
      const content = p.content.replace(linkPattern(from), `[[${to}]]`);
      return content === p.content ? p : { ...p, content };
    }),
  };
}
