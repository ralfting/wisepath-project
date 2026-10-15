import type { Effect } from "effect"
import { Context, Schema } from "effect"
import { PageId, ProjectId } from "../projects/Project"

/**
 * Search everywhere: finding any of the learner's pages, in any of their
 * maps, by its title or its text. Matching ignores case and accents, so
 * "revisao" finds "Revisão"; the database does the same with unaccent.
 */

/** A stretch of text that matched, as [start, end) offsets into it */
export const Mark = Schema.Tuple([Schema.Number, Schema.Number])
export type Mark = typeof Mark.Type

/** The line of a page's text around the first match, with every match in it marked */
export const Excerpt = Schema.Struct({
  text: Schema.String,
  marks: Schema.Array(Mark)
})
export type Excerpt = typeof Excerpt.Type

export const SearchHit = Schema.Struct({
  projectId: ProjectId,
  pageId: PageId,
  title: Schema.String,
  /** The map's title (its root page's) */
  projectTitle: Schema.String,
  /** Titles of the pages between the map's centre and this page, so "NestJS › Providers" says where it sits */
  where: Schema.Array(Schema.String),
  /** ISO date of the page's last edit */
  updatedAt: Schema.String,
  /** Where the text matched; null when only the title did */
  excerpt: Schema.NullOr(Excerpt)
})
export type SearchHit = typeof SearchHit.Type

/** How many results a search returns unless asked otherwise, and at most */
export const SEARCH_LIMIT = 20
export const SEARCH_MAX_LIMIT = 50

/** Search could not be reached right now (network, server down); trying again may work */
export class SearchUnavailable extends Schema.TaggedError<SearchUnavailable>()("SearchUnavailable", {
  cause: Schema.Defect()
}) {}

/** Finds the learner's pages across all their maps, best results first */
export class PageSearch extends Context.Service<PageSearch, {
  readonly search: (query: string, limit?: number) => Effect.Effect<ReadonlyArray<SearchHit>, SearchUnavailable>
}>()("@wisepath/domain/search/PageSearch") {}
