import type { ChartPosition, Connection, Page, Project } from '../types/project.types';

/**
 * Project Entity
 * Pure rules for a project's pages and their undirected connections.
 */

export function makeConnection(pageA: string, pageB: string): Connection {
  return pageA < pageB ? { a: pageA, b: pageB } : { a: pageB, b: pageA };
}

export function areConnected(project: Project, pageA: string, pageB: string): boolean {
  const { a, b } = makeConnection(pageA, pageB);
  return project.connections.some((c) => c.a === a && c.b === b);
}

/** Pages connected to the given page, in chart order */
export function relatedPages(project: Project, pageId: string): Page[] {
  const ids = new Set(
    project.connections.flatMap((c) => (c.a === pageId ? [c.b] : c.b === pageId ? [c.a] : [])),
  );
  return pagesInOrder(project).filter((p) => ids.has(p.id));
}

export function countStudied(project: Project): number {
  return project.pages.filter((p) => p.studied).length;
}

/** Pages left to right on the chart, then top to bottom */
export function pagesInOrder(project: Project): Page[] {
  return [...project.pages].sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
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

function newPageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addPage(project: Project, position: ChartPosition, now = new Date()): { project: Project; page: Page } {
  const page: Page = {
    id: newPageId(),
    title: '',
    content: '',
    position,
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

export function movePage(project: Project, pageId: string, position: ChartPosition): Project {
  return { ...project, pages: project.pages.map((p) => (p.id === pageId ? { ...p, position } : p)) };
}

export function deletePage(project: Project, pageId: string): Project {
  return {
    ...project,
    pages: project.pages.filter((p) => p.id !== pageId),
    connections: project.connections.filter((c) => c.a !== pageId && c.b !== pageId),
  };
}

export function connectPages(project: Project, pageA: string, pageB: string): Project {
  if (pageA === pageB || areConnected(project, pageA, pageB)) return project;
  return { ...project, connections: [...project.connections, makeConnection(pageA, pageB)] };
}

export function disconnectPages(project: Project, pageA: string, pageB: string): Project {
  const { a, b } = makeConnection(pageA, pageB);
  return { ...project, connections: project.connections.filter((c) => !(c.a === a && c.b === b)) };
}


/** The nearest spot to `near` that keeps clear of every existing page */
export function freeSpotNear(project: Project, near: ChartPosition, clearance = 80): ChartPosition {
  const isFree = (p: ChartPosition) =>
    project.pages.every((page) => Math.hypot(page.position.x - p.x, page.position.y - p.y) >= clearance);
  if (isFree(near)) return near;
  for (let ring = 1; ring <= 6; ring++) {
    for (let step = 0; step < 8; step++) {
      const angle = (step / 8) * Math.PI * 2;
      const candidate = {
        x: near.x + Math.cos(angle) * clearance * ring,
        y: near.y + Math.sin(angle) * clearance * ring,
      };
      if (isFree(candidate)) return candidate;
    }
  }
  return { x: near.x + clearance, y: near.y };
}
