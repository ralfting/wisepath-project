import type { Page, Project } from '../types/project.types';

/**
 * Project Entity
 * Pure rules for a project's pages. Pages relate only through [[Title]] links
 * written in their markdown: writing a link is what connects two pages.
 */

export function countStudied(project: Project): number {
  return project.pages.filter((p) => p.studied).length;
}

/** Pages by title, for stable ordering where the map's levels do not apply */
export function pagesInOrder(project: Project): Page[] {
  return [...project.pages].sort((a, b) => displayTitle(a).localeCompare(displayTitle(b)));
}

export function wordCount(markdown: string): number {
  const words = markdown
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#>*_`[\]()-]/g, ' ')
    .trim();
  return words ? words.split(/\s+/).length : 0;
}

export function displayTitle(page: Page): string {
  return page.title.trim() || 'Untitled page';
}

/** The page a [[Title]] link points at: case-insensitive, ignoring surrounding spaces */
export function findPageByTitle<T extends Pick<Page, 'title'>>(pages: T[], title: string): T | undefined {
  const wanted = title.trim().toLowerCase();
  return wanted ? pages.find((p) => p.title.trim().toLowerCase() === wanted) : undefined;
}

function newPageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Adds a page with this title, or returns the existing page that already has it */
export function addPage(project: Project, title: string, now = new Date()): { project: Project; page: Page } {
  const existing = findPageByTitle(project.pages, title);
  if (existing) return { project, page: existing };
  const page: Page = {
    id: newPageId(),
    title: title.trim(),
    content: '',
    position: { x: 0, y: 0 },
    studied: false,
    updatedAt: now.toISOString(),
  };
  return { project: { ...project, pages: [...project.pages, page] }, page };
}

export function updatePage(
  project: Project,
  pageId: string,
  patch: Partial<Pick<Page, 'title' | 'content' | 'studied'>>,
  now = new Date(),
): Project {
  return {
    ...project,
    pages: project.pages.map((p) => {
      if (p.id !== pageId) return p;
      // Toggling studied is not an edit of the page
      const edited = patch.title !== undefined || patch.content !== undefined;
      return { ...p, ...patch, updatedAt: edited ? now.toISOString() : p.updatedAt };
    }),
  };
}

/** Removes the page; links to it stay in other pages and show as missing */
export function deletePage(project: Project, pageId: string): Project {
  return {
    ...project,
    pages: project.pages.filter((p) => p.id !== pageId),
    startPageId: project.startPageId === pageId ? null : project.startPageId,
  };
}

export function setStartPage(project: Project, pageId: string | null): Project {
  return { ...project, startPageId: pageId };
}

/**
 * Writes a [[Title]] link at the end of a page's markdown, as another item
 * when it already ends in a list of links. No-op if the page links it already
 * or the title is the page's own.
 */
export function linkFrom(project: Project, fromId: string, title: string, now = new Date()): Project {
  const from = project.pages.find((p) => p.id === fromId);
  const name = title.trim();
  if (!from || !name || findPageByTitle([from], name)) return project;
  const link = `[[${name}]]`;
  if (from.content.toLowerCase().includes(link.toLowerCase())) return project;

  const trimmed = from.content.trimEnd();
  const lastLine = trimmed.split('\n').pop() ?? '';
  const content = !trimmed
    ? `- ${link}`
    : /^- \[\[[^\]]+\]\]\s*$/.test(lastLine)
      ? `${trimmed}\n- ${link}`
      : `${trimmed}\n\n- ${link}`;
  return updatePage(project, fromId, { content }, now);
}

/**
 * Adds a page one level below `parentId` by writing its [[link]] into the parent.
 * With no parent and no start page yet, the new page becomes the start.
 * A title that already exists links that page instead of duplicating it.
 */
export function addChildPage(
  project: Project,
  parentId: string | null,
  title: string,
): { project: Project; page: Page } {
  const added = addPage(project, title);
  let next = added.project;
  if (parentId) next = linkFrom(next, parentId, added.page.title);
  else if (!next.startPageId) next = setStartPage(next, added.page.id);
  return { project: next, page: added.page };
}

/** Rewrites [[Old]] links to [[New]] across the project after a page is renamed */
export function renameLinks(project: Project, oldTitle: string, newTitle: string): Project {
  const from = oldTitle.trim();
  const to = newTitle.trim();
  if (!from || !to || from === to) return project;
  const source = `\\[\\[\\s*${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\]\\]`;
  return {
    ...project,
    pages: project.pages.map((p) => {
      const content = p.content.replace(new RegExp(source, 'gi'), `[[${to}]]`);
      return content === p.content ? p : { ...p, content };
    }),
  };
}
