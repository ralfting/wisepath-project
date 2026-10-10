import type { Page, Project } from '../types/project.types';

/**
 * Project Entity
 * Pure progress rules for a project's page graph.
 */

export function isStudied(page: Page): boolean {
  return page.studiedAt !== null;
}

export function prerequisitesOf(project: Project, pageId: string): Page[] {
  const ids = project.connections.filter((c) => c.to === pageId).map((c) => c.from);
  return project.pages.filter((p) => ids.includes(p.id));
}

export function followUpsOf(project: Project, pageId: string): Page[] {
  const ids = project.connections.filter((c) => c.from === pageId).map((c) => c.to);
  return project.pages.filter((p) => ids.includes(p.id));
}

export function countStudied(project: Project): number {
  return project.pages.filter(isStudied).length;
}

/**
 * The page to study next: an unstudied page whose prerequisites are all
 * studied, preferring the one that follows the most recently studied page,
 * then the earliest in learning order (leftmost on the chart).
 * Falls back to the leftmost unstudied page; null when everything is studied.
 */
export function findNextPage(project: Project): Page | null {
  const unstudied = project.pages.filter((p) => !isStudied(p));
  if (unstudied.length === 0) return null;

  const byOrder = (a: Page, b: Page) => a.position.x - b.position.x || a.position.y - b.position.y;

  const ready = unstudied.filter((p) => prerequisitesOf(project, p.id).every(isStudied));
  if (ready.length === 0) return [...unstudied].sort(byOrder)[0];

  const lastPrereqStudy = (page: Page) =>
    Math.max(0, ...prerequisitesOf(project, page.id).map((p) => Date.parse(p.studiedAt ?? '') || 0));

  return [...ready].sort((a, b) => lastPrereqStudy(b) - lastPrereqStudy(a) || byOrder(a, b))[0];
}

/** Pages in learning order: left to right on the chart, then top to bottom */
export function pagesInOrder(project: Project): Page[] {
  return [...project.pages].sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
}

export function setStudied(project: Project, pageId: string, studied: boolean, now = new Date()): Project {
  return {
    ...project,
    pages: project.pages.map((p) =>
      p.id === pageId ? { ...p, studiedAt: studied ? now.toISOString() : null } : p,
    ),
  };
}
