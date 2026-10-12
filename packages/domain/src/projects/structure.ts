import { references } from "./links"
import type { Page, PageColor, PageIcon, PageId, Project } from "./Project"

/**
 * Structure
 * How a project's pages sit on the map: the root at the centre, modules
 * around it, topics beside their module. Progress counts topics only, since
 * the root and modules are what topics are grouped under.
 */

export type Role = "root" | "module" | "topic"

export interface ModuleNode {
  readonly page: Page
  readonly topics: ReadonlyArray<Page>
}

export interface Structure {
  readonly root: Page
  /** Modules in the learner's order, each with its topics */
  readonly modules: ReadonlyArray<ModuleNode>
}

export interface Progress {
  readonly studied: number
  readonly total: number
}

export function rootOf(project: Project): Page {
  const root = project.pages.find((p) => p.id === project.rootPageId)
  // A project always has its root; this only guards hand-edited storage
  return root ?? { id: project.rootPageId, title: project.title, content: "", studied: false, updatedAt: "" }
}

/** Root, then its modules, then each module's topics. Pages whose parent is gone count as modules. */
export function structureOf(project: Project): Structure {
  const root = rootOf(project)
  const byId = new Map(project.pages.map((p) => [p.id, p]))
  const isModule = (p: Page) =>
    p.id !== root.id && (!p.parentId || p.parentId === root.id || !byId.has(p.parentId))
  const modulePages = project.pages.filter(isModule)
  const moduleIds = new Set(modulePages.map((p) => p.id))
  return {
    root,
    modules: modulePages.map((page) => ({
      page,
      topics: project.pages.filter((p) => p.parentId === page.id && !moduleIds.has(p.id) && p.id !== root.id)
    }))
  }
}

export function roleOf(project: Project, pageId: PageId): Role | undefined {
  if (pageId === project.rootPageId) return "root"
  const { modules } = structureOf(project)
  if (modules.some((m) => m.page.id === pageId)) return "module"
  return modules.some((m) => m.topics.some((t) => t.id === pageId)) ? "topic" : undefined
}

/** The module a page belongs to: itself for a module, its parent for a topic */
export function moduleOf(project: Project, pageId: PageId): ModuleNode | undefined {
  return structureOf(project).modules.find((m) => m.page.id === pageId || m.topics.some((t) => t.id === pageId))
}

/** Root first, then each module followed by its topics: the reading order of the map */
export function pagesInMapOrder(project: Project): ReadonlyArray<Page> {
  const { root, modules } = structureOf(project)
  return [root, ...modules.flatMap((m) => [m.page, ...m.topics])]
}

export function progressOf(topics: ReadonlyArray<Page>): Progress {
  return { studied: topics.filter((t) => t.studied).length, total: topics.length }
}

export function projectProgress(project: Project): Progress {
  return progressOf(structureOf(project).modules.flatMap((m) => m.topics))
}

/** The first topic not studied yet, in map order: where "Continue studying" goes */
export function nextTopic(project: Project): Page | undefined {
  return structureOf(project).modules.flatMap((m) => m.topics).find((t) => !t.studied)
}

export const DEFAULT_COLOR: PageColor = "blue"
export const DEFAULT_ICON: PageIcon = "book"

/** The colour and icon a page shows: its own, else its module's, else the defaults */
export function lookOf(project: Project, pageId: PageId): { color: PageColor; icon: PageIcon } {
  const page = project.pages.find((p) => p.id === pageId)
  const module = moduleOf(project, pageId)?.page
  return {
    color: page?.color ?? module?.color ?? DEFAULT_COLOR,
    icon: page?.icon ?? module?.icon ?? DEFAULT_ICON
  }
}

export type Relation = "parent" | "child" | "linksTo" | "linkedFrom"

export interface RelatedPage {
  readonly page: Page
  readonly relation: Relation
}

/**
 * Pages related to one page: where it sits in the tree (its parent, then its
 * children), then the pages its [[links]] point to, then the pages linking to
 * it. Each page appears once, under its first relation.
 */
export function relatedPages(project: Project, pageId: PageId): ReadonlyArray<RelatedPage> {
  const page = project.pages.find((p) => p.id === pageId)
  if (!page) return []
  const { modules } = structureOf(project)
  const byId = new Map(project.pages.map((p) => [p.id, p]))
  const parent =
    roleOf(project, pageId) === "module"
      ? byId.get(project.rootPageId)
      : page.parentId
        ? byId.get(page.parentId)
        : undefined
  const children =
    pageId === project.rootPageId
      ? modules.map((m) => m.page)
      : (modules.find((m) => m.page.id === pageId)?.topics ?? [])
  const refs = references(project)

  const out: RelatedPage[] = []
  const seen = new Set<PageId>([pageId])
  const push = (p: Page | undefined, relation: Relation) => {
    if (!p || seen.has(p.id)) return
    seen.add(p.id)
    out.push({ page: p, relation })
  }
  push(parent, "parent")
  for (const c of children) push(c, "child")
  for (const r of refs) if (r.from === pageId) push(byId.get(r.to), "linksTo")
  for (const r of refs) if (r.to === pageId) push(byId.get(r.from), "linkedFrom")
  return out
}
