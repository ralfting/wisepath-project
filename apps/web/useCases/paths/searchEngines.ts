import type { MetadataRoute } from "next"
import type { CatalogEntry } from "@wisepath/domain/paths"
import { catalogHref, exploreHref } from "@/shared/routes"

/**
 * What WisePath tells search engines (docs/plans/20-published-pages.md). Nothing until the site has a domain of
 * its own; then the catalog's pages, and none of the areas behind a login.
 */

/** Areas that need an account: nothing in them is for a search engine */
const PRIVATE_AREAS = ["/paths", "/inbox", "/admin", "/capture", "/settings"]

/** robots.txt: closed without a domain; with one, open but for the private areas, pointing at the sitemap */
export const robotsOf = (site: string | null): MetadataRoute.Robots =>
  site === null
    ? { rules: { userAgent: "*", disallow: "/" } }
    : { rules: { userAgent: "*", allow: "/", disallow: PRIVATE_AREAS }, sitemap: `${site}/sitemap.xml` }

/** The sitemap: the catalog, every published path and each of its pages, with when it last changed; empty without a domain */
export const sitemapOf = (site: string | null, entries: ReadonlyArray<CatalogEntry>): MetadataRoute.Sitemap => {
  if (site === null) return []
  const entry = (href: string, updatedAt: string) => ({ url: `${site}${href}`, ...(updatedAt ? { lastModified: updatedAt } : {}) })
  return [
    { url: `${site}${exploreHref()}` },
    ...entries.flatMap((path) => [
      entry(catalogHref(path.slug), path.updatedAt),
      ...path.pages.map((page) => entry(catalogHref(path.slug, page.slug), page.updatedAt))
    ])
  ]
}
