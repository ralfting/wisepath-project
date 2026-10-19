import "server-only"
import { cache } from "react"
import { Cause, Exit, Option } from "effect"
import type { CatalogEntry, Path, PendingPublication } from "@wisepath/domain/paths"
import { siteUrl } from "@/infrastructure/server/ServerApiClient"
import { runServer } from "../server"
import * as programs from "./programs"

/** Path reads for Server Components */

/**
 * A map as the learner may read it, read once per request (the layout, the page and the tab title share it).
 * Missing: there is none for them (gone, someone else's, a malformed id), so the route answers 404. Unknown: the
 * API couldn't say (down, or the session expired), so the browser decides as before.
 */
export const readablePath = cache(
  async (pathId: string): Promise<{ readonly status: "found"; readonly path: Path } | { readonly status: "missing" | "unknown" }> => {
    const exit = await runServer(programs.readPath(pathId))
    if (Exit.isSuccess(exit)) return { status: "found", path: exit.value }
    const error = Cause.findErrorOption(exit.cause)
    return Option.isSome(error) && error.value._tag !== "PathsUnavailable" ? { status: "missing" } : { status: "unknown" }
  }
)

/** The map's title, read with the learner's session; null when it can't be read */
export const pathTitle = async (pathId: string): Promise<string | null> => {
  const read = await readablePath(pathId)
  return read.status === "found" ? read.path.title : null
}

/**
 * A public map, read without anyone's session: null when there is none (private, gone, or a malformed id). The API
 * being down is thrown, for the segment's error page.
 */
export const publicPath = cache(async (pathId: string): Promise<Path | null> => {
  const exit = await runServer(programs.readPublicPath(pathId))
  if (Exit.isSuccess(exit)) return exit.value
  const error = Cause.findErrorOption(exit.cause)
  if (Option.isSome(error) && error.value._tag !== "PathsUnavailable") return null
  throw new Error("The public map could not be read")
})

/**
 * A published map by its catalog address, read without anyone's session: null when there is none. The API being
 * down is thrown, for the segment's error page.
 */
export const publishedPath = cache(async (slug: string): Promise<Path | null> => {
  const exit = await runServer(programs.readPublishedPath(slug))
  if (Exit.isSuccess(exit)) return exit.value
  const error = Cause.findErrorOption(exit.cause)
  if (Option.isSome(error) && error.value._tag !== "PathsUnavailable") return null
  throw new Error("The published map could not be read")
})

/**
 * The requests to publish waiting for review, for an administrator: null for anyone else (not an administrator, or
 * logged out), so the page answers 404. The API being down is thrown, for the segment's error page.
 */
export const pendingPublications = async (): Promise<ReadonlyArray<PendingPublication> | null> => {
  const exit = await runServer(programs.pendingPublications)
  if (Exit.isSuccess(exit)) return exit.value
  const error = Cause.findErrorOption(exit.cause)
  if (Option.isSome(error) && error.value._tag === "NotAdmin") return null
  throw new Error("The requests to publish could not be read")
}

/** Where WisePath lives once it has a domain of its own; null until then, which keeps search engines out */
export const site = (): string | null => siteUrl

/** Every published map's address and its pages, for the sitemap; none when the API can't be reached */
export const catalogEntries = async (): Promise<ReadonlyArray<CatalogEntry>> => {
  const exit = await runServer(programs.listCatalog({}))
  return Exit.isSuccess(exit) ? exit.value : []
}

/**
 * The published maps the catalog page asks for (the words searched, a language), read without anyone's session. The
 * API being down is thrown, for the segment's error page, rather than shown as an empty catalog.
 */
export const publishedCatalog = cache(async (q: string | null, language: string | null): Promise<ReadonlyArray<CatalogEntry>> => {
  const exit = await runServer(programs.listCatalog({ ...(q ? { q } : {}), ...(language ? { language } : {}) }))
  if (Exit.isSuccess(exit)) return exit.value
  throw new Error("The catalog could not be read")
})
