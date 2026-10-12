import { Schema } from "effect"

/**
 * A project is a subject being learned: pages of free markdown that link each
 * other with [[Title]]. The links, read from the start page down, set the levels.
 */

export const ProjectId = Schema.String.pipe(Schema.brand("ProjectId"))
export type ProjectId = typeof ProjectId.Type

export const PageId = Schema.String.pipe(Schema.brand("PageId"))
export type PageId = typeof PageId.Type

export const Page = Schema.Struct({
  id: PageId,
  title: Schema.String,
  /** Free-form markdown: explanations, notes, links, YouTube URLs on their own line */
  content: Schema.String,
  studied: Schema.Boolean,
  /** ISO date of the last edit to the title or text */
  updatedAt: Schema.String
})
export type Page = typeof Page.Type

export const Project = Schema.Struct({
  id: ProjectId,
  title: Schema.String,
  pages: Schema.Array(Page),
  /** Level 1 of the map; everything descends from it through [[links]] */
  startPageId: Schema.optional(Schema.NullOr(PageId)),
  /** What the learner will know at the end, as in "Now I know JavaScript" */
  subject: Schema.optional(Schema.String),
  /** True for demonstration content that is not a real user's project */
  isSample: Schema.optional(Schema.Boolean)
})
export type Project = typeof Project.Type
