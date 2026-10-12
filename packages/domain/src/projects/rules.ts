import type { Page, PageColor, PageIcon, PageId, Project } from './Project';
import { PageColor as PageColors } from './Project';
import { moduleOf, roleOf, structureOf } from './structure';

/**
 * Rules
 * Pure changes to a project. The tree (root, modules, topics) comes from each
 * page's parent; cross references come from [[Title]] links in the markdown,
 * so titles stay unique within a project.
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

/** The page a [[Title]] link points at: case-insensitive, ignoring surrounding spaces */
export function findPageByTitle<T extends Pick<Page, 'title'>>(pages: ReadonlyArray<T>, title: string): T | undefined {
  const wanted = title.trim().toLowerCase();
  return wanted ? pages.find((p) => p.title.trim().toLowerCase() === wanted) : undefined;
}

/** A new, empty project: just its root page */
export function newProject(id: Project['id'], title: string, rootId: PageId, now = new Date()): Project {
  const root: Page = { id: rootId, title: title.trim(), content: '', studied: false, updatedAt: now.toISOString(), parentId: null };
  return { id, title: root.title, pages: [root], rootPageId: rootId };
}

/** Adds a page under `parentId`, or returns the page that already has this title */
function addUnder(
  project: Project,
  parentId: PageId,
  title: string,
  id: PageId,
  now: Date,
  look: Partial<Pick<Page, 'color' | 'icon'>> = {},
): { project: Project; page: Page } {
  const existing = findPageByTitle(project.pages, title);
  if (existing) return { project, page: existing };
  const page: Page = { id, title: title.trim(), content: '', studied: false, updatedAt: now.toISOString(), parentId, ...look };
  return { project: { ...project, pages: [...project.pages, page] }, page };
}

/** Adds a module around the root; each new module takes the next colour */
export function addModule(project: Project, title: string, id: PageId, now = new Date()): { project: Project; page: Page } {
  const colors = PageColors.literals;
  const color: PageColor = colors[structureOf(project).modules.length % colors.length];
  return addUnder(project, project.rootPageId, title, id, now, { color });
}

/**
 * Adds a topic to the module of `pageId` (the module itself, or a topic's
 * module). From the root there is no module yet, so it adds a module instead.
 * This is also where a page created from a [[link]] goes.
 */
export function addTopic(
  project: Project,
  pageId: PageId,
  title: string,
  id: PageId,
  now = new Date(),
): { project: Project; page: Page } {
  const module = moduleOf(project, pageId);
  return module ? addUnder(project, module.page.id, title, id, now) : addModule(project, title, id, now);
}

export function updatePage(
  project: Project,
  pageId: PageId,
  patch: Partial<Pick<Page, 'title' | 'content' | 'studied'>>,
  now = new Date(),
): Project {
  const pages = project.pages.map((p) => {
    if (p.id !== pageId) return p;
    // Toggling studied is not an edit of the page
    const edited = patch.title !== undefined || patch.content !== undefined;
    return { ...p, ...patch, updatedAt: edited ? now.toISOString() : p.updatedAt };
  });
  // The root page names the map
  const title = pageId === project.rootPageId && patch.title !== undefined ? patch.title : project.title;
  return { ...project, title, pages };
}

/** Sets a page's colour or icon on the map */
export function setLook(project: Project, pageId: PageId, look: { color?: PageColor; icon?: PageIcon }): Project {
  return { ...project, pages: project.pages.map((p) => (p.id === pageId ? { ...p, ...look } : p)) };
}

/** Moves a topic to another module; anything else stays put */
export function moveTopic(project: Project, topicId: PageId, moduleId: PageId): Project {
  if (roleOf(project, topicId) !== 'topic' || roleOf(project, moduleId) !== 'module') return project;
  return { ...project, pages: project.pages.map((p) => (p.id === topicId ? { ...p, parentId: moduleId } : p)) };
}

export function setDescription(project: Project, description: string): Project {
  return { ...project, description };
}

/**
 * Removes a page; a module goes with its topics. The root can't be removed.
 * [[Links]] to removed pages stay in other pages and show as missing.
 */
export function deletePage(project: Project, pageId: PageId): Project {
  if (pageId === project.rootPageId) return project;
  const gone = new Set<PageId>([pageId]);
  if (roleOf(project, pageId) === 'module') for (const p of project.pages) if (p.parentId === pageId) gone.add(p.id);
  return { ...project, pages: project.pages.filter((p) => !gone.has(p.id)) };
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
