import { citationsOf, connections, linksOf } from "./links"
import type { Page, PageColor, PageIcon, PageId, Path } from "./Path"

/**
 * Tree
 * The map read from its links. Starting at the root, level by level, the first
 * link that reaches a page makes it a branch of the linking page; pages are
 * visited in the order they were reached, and each page's links in the order
 * they are written, so the learner orders branches by ordering links. Every
 * other link becomes an arrow, except links back to the root or to the
 * page's own ancestors, which only show as related pages. Citations never
 * place a page: they cross the map between pages links put on it. Pages no
 * link reaches are orphans, however often they are cited.
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
  /** Citations between pages on the map, one per pair, none where a link already joins the two */
  readonly citations: ReadonlyArray<Arrow>
  /** Pages no link reaches from the root, by title */
  readonly orphans: ReadonlyArray<Page>
}

export interface Progress {
  readonly studied: number
  readonly total: number
}

const fallbackRoot = (path: Path): Page => ({
  id: path.rootPageId,
  title: path.title,
  content: "",
  studied: false,
  updatedAt: ""
})

export function rootOf(path: Path): Page {
  // A path always has its root; this only guards hand-edited storage
  return path.pages.find((p) => p.id === path.rootPageId) ?? fallbackRoot(path)
}

export function mapTree(path: Path): MapTree {
  const root = rootOf(path)
  const byId = new Map(path.pages.map((p) => [p.id, p]))
  const parentOf = new Map<PageId, PageId | null>([[root.id, null]])
  const depthOf = new Map<PageId, number>([[root.id, 0]])
  const childrenOf = new Map<PageId, PageId[]>()
  const order: PageId[] = [root.id]
  const candidates: Arrow[] = []

  // Breadth-first: a page's place is fixed by the first link that reaches it
  for (let i = 0; i < order.length; i++) {
    const id = order[i]
    const kids: PageId[] = []
    for (const to of linksOf(path, id)) {
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
  const pairOf = (from: PageId, to: PageId) => (from < to ? `${from}|${to}` : `${to}|${from}`)
  const pairs = new Set<string>()
  const arrows = candidates.filter(({ from, to }) => {
    if (to === root.id || isAncestor(to, from)) return false
    if (parentOf.get(from) === to || parentOf.get(to) === from) return false
    const pair = pairOf(from, to)
    if (pairs.has(pair)) return false
    pairs.add(pair)
    return true
  })

  // A pair a link joins shows that link's line, or none when it leads back up: the stronger connection wins
  const linked = new Set(order.flatMap((from) => linksOf(path, from).map((to) => pairOf(from, to))))
  const cited = new Set<string>()
  const citations = order.flatMap((from) =>
    citationsOf(path, from).flatMap((to) => {
      const pair = pairOf(from, to)
      if (!parentOf.has(to) || linked.has(pair) || cited.has(pair)) return []
      cited.add(pair)
      return [{ from, to }]
    })
  )

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

  const orphans = path.pages
    .filter((p) => !parentOf.has(p.id))
    .sort((a, b) => a.title.localeCompare(b.title))

  return { root: rootNode, nodes, arrows, citations, orphans }
}

/** Every page below a node, depth first in branch order */
export function descendants(node: MapNode): ReadonlyArray<Page> {
  return node.children.flatMap((c) => [c.page, ...descendants(c)])
}

/** Root first, then each branch depth first: the reading order of the map */
export function pagesInMapOrder(path: Path): ReadonlyArray<Page> {
  const { root } = mapTree(path)
  return [root.page, ...descendants(root)]
}

/**
 * The pages before and after this one in the map's reading order: down into its first branch, else on to the next
 * branch beside it, else back up to the next branch beside the page above. None for an unlinked page.
 */
export function neighbours(path: Path, pageId: PageId): { readonly previous?: Page; readonly next?: Page } {
  const order = pagesInMapOrder(path)
  const index = order.findIndex((p) => p.id === pageId)
  if (index < 0) return {}
  return {
    ...(index > 0 ? { previous: order[index - 1] } : {}),
    ...(index < order.length - 1 ? { next: order[index + 1] } : {})
  }
}

export function progressOf(pages: ReadonlyArray<Page>): Progress {
  return { studied: pages.filter((p) => p.studied).length, total: pages.length }
}

/** Studied pages below a page (not counting itself) */
export function branchProgress(path: Path, pageId: PageId): Progress | undefined {
  const node = mapTree(path).nodes.get(pageId)
  return node ? progressOf(descendants(node)) : undefined
}

/** The root and every page it reaches, orphans aside: the root is the first step of the study */
export function pathProgress(path: Path): Progress {
  return progressOf(pagesInMapOrder(path))
}

/** The first page not studied yet, in map order, the root first: where "Start" and "Continue studying" go */
export function nextPage(path: Path): Page | undefined {
  return pagesInMapOrder(path).find((p) => !p.studied)
}

/** Pages from the root down to this one; empty for an orphan. Pass the tree when you have it. */
export function trailTo(path: Path, pageId: PageId, tree: MapTree = mapTree(path)): ReadonlyArray<Page> {
  const { nodes } = tree
  const trail: Page[] = []
  for (let node = nodes.get(pageId); node; node = node.parentId ? nodes.get(node.parentId) : undefined) {
    trail.unshift(node.page)
  }
  return trail
}

export const DEFAULT_COLOR: PageColor = "blue"
export const DEFAULT_ICON: PageIcon = "book"

/**
 * The colour and icon a page shows: its own if it is a module or the root,
 * else the colour of the nearest module above it.
 */
export function lookOf(
  path: Path,
  pageId: PageId,
  tree: MapTree = mapTree(path)
): { color: PageColor; icon: PageIcon } {
  const trail = trailTo(path, pageId, tree)
  const page = path.pages.find((p) => p.id === pageId)
  const styled = [...trail].reverse().find((p) => p.module || p.id === path.rootPageId)
  const own = page && (page.module || page.id === path.rootPageId) ? page : undefined
  const source = own ?? (styled && styled.id !== path.rootPageId ? styled : undefined)
  return { color: source?.color ?? DEFAULT_COLOR, icon: own?.icon ?? DEFAULT_ICON }
}

/** How a page relates to another, strongest first */
export type Relation = "parent" | "child" | "linksTo" | "linkedFrom" | "cites" | "citedBy"

export interface RelatedPage {
  readonly page: Page
  readonly relation: Relation
}

/**
 * Pages related to one page: the page it branches from, its branches, then
 * the pages its [[links]] point to, the pages linking to it, the pages it
 * cites and the pages citing it. Each page appears once, under its strongest
 * relation, so a page both linked and cited shows as linked.
 */
export function relatedPages(path: Path, pageId: PageId): ReadonlyArray<RelatedPage> {
  const { nodes } = mapTree(path)
  const byId = new Map(path.pages.map((p) => [p.id, p]))
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
  const toHere = connections(path).filter((c) => c.to === pageId)
  for (const to of linksOf(path, pageId)) push(byId.get(to), "linksTo")
  for (const c of toHere) if (c.kind === "link") push(byId.get(c.from), "linkedFrom")
  for (const to of citationsOf(path, pageId)) push(byId.get(to), "cites")
  for (const c of toHere) if (c.kind === "citation") push(byId.get(c.from), "citedBy")
  return out
}
