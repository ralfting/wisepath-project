import { linksOf, references } from "./links"
import type { Page, PageColor, PageIcon, PageId, Project } from "./Project"

/**
 * Tree
 * The map read from its links. Starting at the root, level by level, the first
 * link that reaches a page makes it a branch of the linking page; pages are
 * visited in the order they were reached, and each page's links in the order
 * they are written, so the learner orders branches by ordering links. Every
 * other link becomes an arrow, except links back to the root or to the
 * page's own ancestors, which only show as related pages. Pages no link
 * reaches are orphans.
 */

export interface MapNode {
  readonly page: Page
  readonly depth: number
  readonly parentId: PageId | null
  readonly children: ReadonlyArray<MapNode>
}

export interface Arrow {
  readonly from: PageId
  readonly to: PageId
}

export interface MapTree {
  readonly root: MapNode
  readonly nodes: ReadonlyMap<PageId, MapNode>
  /** Links drawn as arrows: not a branch, not back to the root or an ancestor, one per pair */
  readonly arrows: ReadonlyArray<Arrow>
  /** Pages no link reaches from the root, by title */
  readonly orphans: ReadonlyArray<Page>
}

export interface Progress {
  readonly studied: number
  readonly total: number
}

const fallbackRoot = (project: Project): Page => ({
  id: project.rootPageId,
  title: project.title,
  content: "",
  studied: false,
  updatedAt: ""
})

export function rootOf(project: Project): Page {
  // A project always has its root; this only guards hand-edited storage
  return project.pages.find((p) => p.id === project.rootPageId) ?? fallbackRoot(project)
}

export function mapTree(project: Project): MapTree {
  const root = rootOf(project)
  const byId = new Map(project.pages.map((p) => [p.id, p]))
  const parentOf = new Map<PageId, PageId | null>([[root.id, null]])
  const depthOf = new Map<PageId, number>([[root.id, 0]])
  const childrenOf = new Map<PageId, PageId[]>()
  const order: PageId[] = [root.id]
  const candidates: Arrow[] = []

  // Breadth-first: a page's place is fixed by the first link that reaches it
  for (let i = 0; i < order.length; i++) {
    const id = order[i]
    const kids: PageId[] = []
    for (const to of linksOf(project, id)) {
      if (!byId.has(to) && to !== root.id) continue
      if (parentOf.has(to)) {
        candidates.push({ from: id, to })
        continue
      }
      parentOf.set(to, id)
      depthOf.set(to, depthOf.get(id)! + 1)
      kids.push(to)
      order.push(to)
    }
    childrenOf.set(id, kids)
  }

  const isAncestor = (ancestor: PageId, of: PageId) => {
    for (let p = parentOf.get(of) ?? null; p !== null; p = parentOf.get(p) ?? null) if (p === ancestor) return true
    return false
  }
  const pairs = new Set<string>()
  const arrows = candidates.filter(({ from, to }) => {
    if (to === root.id || isAncestor(to, from)) return false
    if (parentOf.get(from) === to || parentOf.get(to) === from) return false
    const pair = from < to ? `${from}|${to}` : `${to}|${from}`
    if (pairs.has(pair)) return false
    pairs.add(pair)
    return true
  })

  const nodes = new Map<PageId, MapNode>()
  const build = (id: PageId): MapNode => {
    const node: MapNode = {
      page: id === root.id ? root : byId.get(id)!,
      depth: depthOf.get(id)!,
      parentId: parentOf.get(id) ?? null,
      children: (childrenOf.get(id) ?? []).map(build)
    }
    nodes.set(id, node)
    return node
  }
  const rootNode = build(root.id)

  const orphans = project.pages
    .filter((p) => !parentOf.has(p.id))
    .sort((a, b) => a.title.localeCompare(b.title))

  return { root: rootNode, nodes, arrows, orphans }
}

/** Every page below a node, depth first in branch order */
export function descendants(node: MapNode): ReadonlyArray<Page> {
  return node.children.flatMap((c) => [c.page, ...descendants(c)])
}

/** Root first, then each branch depth first: the reading order of the map */
export function pagesInMapOrder(project: Project): ReadonlyArray<Page> {
  const { root } = mapTree(project)
  return [root.page, ...descendants(root)]
}

export function progressOf(pages: ReadonlyArray<Page>): Progress {
  return { studied: pages.filter((p) => p.studied).length, total: pages.length }
}

/** Studied pages below a page (not counting itself); the root's covers the whole map */
export function branchProgress(project: Project, pageId: PageId): Progress | undefined {
  const node = mapTree(project).nodes.get(pageId)
  return node ? progressOf(descendants(node)) : undefined
}

/** Every page the root reaches, orphans aside */
export function projectProgress(project: Project): Progress {
  return progressOf(descendants(mapTree(project).root))
}

/** The first page not studied yet, in map order: where "Continue studying" goes */
export function nextPage(project: Project): Page | undefined {
  return descendants(mapTree(project).root).find((p) => !p.studied)
}

/** Pages from the root down to this one; empty for an orphan */
export function pathTo(project: Project, pageId: PageId): ReadonlyArray<Page> {
  const { nodes } = mapTree(project)
  const path: Page[] = []
  for (let node = nodes.get(pageId); node; node = node.parentId ? nodes.get(node.parentId) : undefined) {
    path.unshift(node.page)
  }
  return path
}

export const DEFAULT_COLOR: PageColor = "blue"
export const DEFAULT_ICON: PageIcon = "book"

/**
 * The colour and icon a page shows: its own if it is a module or the root,
 * else the colour of the nearest module above it.
 */
export function lookOf(project: Project, pageId: PageId): { color: PageColor; icon: PageIcon } {
  const path = pathTo(project, pageId)
  const page = project.pages.find((p) => p.id === pageId)
  const styled = [...path].reverse().find((p) => p.module || p.id === project.rootPageId)
  const own = page && (page.module || page.id === project.rootPageId) ? page : undefined
  const source = own ?? (styled && styled.id !== project.rootPageId ? styled : undefined)
  return { color: source?.color ?? DEFAULT_COLOR, icon: own?.icon ?? DEFAULT_ICON }
}

export type Relation = "parent" | "child" | "linksTo" | "linkedFrom"

export interface RelatedPage {
  readonly page: Page
  readonly relation: Relation
}

/**
 * Pages related to one page: the page it branches from, its branches, then
 * the pages its [[links]] point to, then the pages linking to it. Each page
 * appears once, under its first relation.
 */
export function relatedPages(project: Project, pageId: PageId): ReadonlyArray<RelatedPage> {
  const { nodes } = mapTree(project)
  const byId = new Map(project.pages.map((p) => [p.id, p]))
  const node = nodes.get(pageId)
  const out: RelatedPage[] = []
  const seen = new Set<PageId>([pageId])
  const push = (p: Page | undefined, relation: Relation) => {
    if (!p || seen.has(p.id)) return
    seen.add(p.id)
    out.push({ page: p, relation })
  }
  if (node?.parentId) push(byId.get(node.parentId), "parent")
  for (const c of node?.children ?? []) push(c.page, "child")
  for (const to of linksOf(project, pageId)) push(byId.get(to), "linksTo")
  for (const r of references(project)) if (r.to === pageId) push(byId.get(r.from), "linkedFrom")
  return out
}
