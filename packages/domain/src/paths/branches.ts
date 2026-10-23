import { linksOf, withLinkTo } from "./links"
import type { Page, PageId, Path } from "./Path"
import { linkPattern } from "./rules"
import { mapTree, pagesInMapOrder } from "./tree"

/**
 * Branches
 * Where a page branches from is not stored: the first [[link]] that reaches it
 * decides (tree.ts). Moving a page to another branch is therefore an edit of
 * two texts: the link leaves the page it branched from and is added to the end
 * of the new one.
 */

/**
 * The text without its links to a page: a line holding only the link (a list
 * item too) goes whole, as the map's + wrote it; a link inside a sentence stays
 * as plain words, so the sentence still reads.
 */
function withoutLink(markdown: string, title: string): string {
  const whole = new RegExp(`^\\s*(?:[-*+]\\s+|\\d+[.)]\\s+)?${linkPattern(title).source}\\s*$`, "i")
  const kept: string[] = []
  let dropped = false
  for (const line of markdown.split("\n")) {
    if (whole.test(line)) {
      dropped = true
      continue
    }
    // A removed line between two blank ones would leave a double gap
    if (dropped && !line.trim() && (kept.length === 0 || !kept[kept.length - 1].trim())) continue
    dropped = false
    kept.push(line.replace(linkPattern(title), title))
  }
  const text = kept.join("\n")
  return markdown === markdown.trimEnd() ? text.trimEnd() : text
}

/**
 * Moves a page to branch from another: its link leaves the page it branched
 * from (an unlinked page has none) and is added at the end of the new one's
 * text, unless that text links it already. The root, a page under itself or
 * where it already is change nothing. Whether the move holds depends on the
 * other links to the page: branchTargets lists the pages where it does.
 */
export function moveBranch(path: Path, pageId: PageId, parentId: PageId): Path {
  const page = path.pages.find((p) => p.id === pageId)
  const parent = path.pages.find((p) => p.id === parentId)
  if (!page || !parent || pageId === path.rootPageId || pageId === parentId) return path
  const from = mapTree(path).nodes.get(pageId)?.parentId ?? null
  if (from === parentId) return path
  const title = page.title.trim()
  const linked = linksOf(path, parentId).includes(pageId)
  return {
    ...path,
    pages: path.pages.map((p) => {
      if (p.id === from) return { ...p, content: withoutLink(p.content, title) }
      if (p.id === parentId && !linked) return { ...p, content: withLinkTo(p.content, title) }
      return p
    })
  }
}

/**
 * The pages a page can move under, in the map's reading order: those on the
 * map where, once moved, it does branch from them. Its own branches can't take
 * it (it would cut itself off), nor a page reached later than another that
 * links to it, since the first link to reach a page wins.
 */
export function branchTargets(path: Path, pageId: PageId): ReadonlyArray<Page> {
  if (pageId === path.rootPageId) return []
  const from = mapTree(path).nodes.get(pageId)?.parentId ?? null
  return pagesInMapOrder(path).filter(
    (p) => p.id !== pageId && p.id !== from && mapTree(moveBranch(path, pageId, p.id)).nodes.get(pageId)?.parentId === p.id
  )
}
