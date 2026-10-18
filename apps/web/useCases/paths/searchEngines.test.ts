import { describe, expect, it } from "vitest"
import { robotsOf, sitemapOf } from "./searchEngines"

const entries = [
  { slug: "testes-em-react", updatedAt: "2026-10-02T00:00:00.000Z", pages: [{ slug: "user-event", updatedAt: "2026-10-02T00:00:00.000Z" }] }
]

describe("what search engines are told", () => {
  it("offers them nothing until the site has a domain of its own", () => {
    expect(robotsOf(null)).toEqual({ rules: { userAgent: "*", disallow: "/" } })
    expect(sitemapOf(null, entries)).toEqual([])
  })

  it("lists every published path and page with a domain, and keeps them out of the areas behind a login", () => {
    const site = "https://wisepath.com.br"
    expect(robotsOf(site)).toMatchObject({ sitemap: "https://wisepath.com.br/sitemap.xml", rules: { allow: "/" } })
    expect((robotsOf(site).rules as { disallow: Array<string> }).disallow).toContain("/paths")
    expect(sitemapOf(site, entries)).toEqual([
      { url: "https://wisepath.com.br/p/testes-em-react", lastModified: "2026-10-02T00:00:00.000Z" },
      { url: "https://wisepath.com.br/p/testes-em-react/user-event", lastModified: "2026-10-02T00:00:00.000Z" }
    ])
  })
})
