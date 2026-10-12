import { Schema } from "effect"

/**
 * A project is a map of what someone is learning. Its pages form a tree three
 * levels deep: one root page (named like the map), the modules under it, and
 * the topics under each module. Every level is a page of free markdown, and
 * any page can reference any other with a [[Title]] link (a cross reference).
 */

export const ProjectId = Schema.String.pipe(Schema.brand("ProjectId"))
export type ProjectId = typeof ProjectId.Type

export const PageId = Schema.String.pipe(Schema.brand("PageId"))
export type PageId = typeof PageId.Type

/** Colours a learner can give a module; the UI maps them to its palette */
export const PageColor = Schema.Literals([
  "blue",
  "teal",
  "violet",
  "orange",
  "grape",
  "pink",
  "yellow",
  "cyan",
  "indigo",
  "red",
  "green",
  "lime"
])
export type PageColor = typeof PageColor.Type

/** Icons a learner can give a module; the UI maps them to its icon set */
export const PageIcon = Schema.Literals([
  "book",
  "box",
  "cube",
  "database",
  "rocket",
  "lock",
  "network",
  "flask",
  "code",
  "server",
  "bolt",
  "puzzle",
  "layers",
  "world",
  "route",
  "school"
])
export type PageIcon = typeof PageIcon.Type

export const Page = Schema.Struct({
  id: PageId,
  title: Schema.String,
  /** Free-form markdown: explanations, notes, links, YouTube URLs on their own line */
  content: Schema.String,
  studied: Schema.Boolean,
  /** ISO date of the last edit to the title or text */
  updatedAt: Schema.String,
  /** The page this one sits under: the root for a module, a module for a topic, none for the root */
  parentId: Schema.optional(Schema.NullOr(PageId)),
  /** How the page shows on the map; set on the root and modules, topics take their module's */
  color: Schema.optional(PageColor),
  icon: Schema.optional(PageIcon)
})
export type Page = typeof Page.Type

export const Project = Schema.Struct({
  id: ProjectId,
  /** Always the root page's title */
  title: Schema.String,
  /** One line on what the map covers, shown under its title */
  description: Schema.optional(Schema.String),
  pages: Schema.Array(Page),
  /** The single page at the centre of the map */
  rootPageId: PageId,
  /** True for demonstration content that is not a real user's project */
  isSample: Schema.optional(Schema.Boolean)
})
export type Project = typeof Project.Type
