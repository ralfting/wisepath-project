import { Schema } from "effect"
import type { Page, Path, PageId } from "./Path"

/**
 * Readable addresses for published paths (docs/plans/20-published-pages.md): made from titles, so a page's address
 * says what it is about.
 */

/** Long titles are cut so an address stays readable */
const SLUG_MAX = 80

/** A title as an address part: lower case, accents dropped, anything else between words a single "-" */
export function slugOf(title: string): string {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, SLUG_MAX)
    .replace(/^-+|-+$/g, "")
}

/** A slug not among those taken: the base, else "base-2", "base-3"...; "page" stands in for an empty base */
export function freeSlug(base: string, taken: ReadonlySet<string>): string {
  const root = base || "page"
  let candidate = root
  for (let n = 2; taken.has(candidate); n++) candidate = `${root}-${n}`
  return candidate
}

/** Each page's address within its path, unique by page order; the root page has none: it is the path's own */
export function pageSlugs(path: Path): ReadonlyMap<PageId, string> {
  const taken = new Set<string>()
  const slugs = new Map<PageId, string>()
  for (const page of path.pages) {
    if (page.id === path.rootPageId) continue
    const slug = freeSlug(slugOf(page.title), taken)
    taken.add(slug)
    slugs.set(page.id, slug)
  }
  return slugs
}

/** The page at an address within the path: the root without one, a page by its slug, none when nothing is there */
export function pageAt(path: Path, slug: string | null): Page | undefined {
  if (slug === null) return path.pages.find((page) => page.id === path.rootPageId)
  for (const [id, pageSlug] of pageSlugs(path)) if (pageSlug === slug) return path.pages.find((page) => page.id === id)
  return undefined
}

/** A published path as the sitemap lists it: its address, and each page's with when it last changed (ISO dates) */
export const CatalogEntry = Schema.Struct({
  slug: Schema.String,
  updatedAt: Schema.String,
  pages: Schema.Array(Schema.Struct({ slug: Schema.String, updatedAt: Schema.String }))
})
export type CatalogEntry = typeof CatalogEntry.Type

/** A published path's entry in the sitemap; the path changed when its latest page did. None without an address */
export function catalogEntry(path: Path): CatalogEntry | null {
  if (!path.slug) return null
  const slugs = pageSlugs(path)
  const latest = (dates: ReadonlyArray<string>) => dates.reduce((a, b) => (b > a ? b : a), "")
  return {
    slug: path.slug,
    updatedAt: latest(path.pages.map((page) => page.updatedAt)),
    pages: path.pages.flatMap((page) => {
      const slug = slugs.get(page.id)
      return slug ? [{ slug, updatedAt: page.updatedAt }] : []
    })
  }
}
