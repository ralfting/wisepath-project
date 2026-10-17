import { Schema } from "effect"
import { PathAccess, PathVisibility } from "./access"

/**
 * A path is a map of what someone is learning: pages of free markdown that
 * connect only through [[Title]] links. One root page, named like the map,
 * sits at the centre; the map reads the links outward from it (see tree.ts).
 * Any page can be shown as a module: drawn larger, with a colour and an icon.
 */

export const PathId = Schema.String.pipe(Schema.brand("PathId"))
export type PathId = typeof PathId.Type

export const PageId = Schema.String.pipe(Schema.brand("PageId"))
export type PageId = typeof PageId.Type

/** Colours a learner can give a module or the root; the UI maps them to its palette */
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

/** Icons a learner can give a module or the root; the UI maps them to its icon set */
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

/**
 * What a map is for. A study is open notes, organised as a map with nothing to
 * finish; a learning path is followed to the end, page by page, and tracks
 * what was studied. Switching keeps the studied marks, hidden in a study.
 */
export const PathKind = Schema.Literals(["study", "learningPath"])
export type PathKind = typeof PathKind.Type

export const Page = Schema.Struct({
  id: PageId,
  title: Schema.String,
  /** Free-form markdown: explanations, notes, links, YouTube URLs on their own line */
  content: Schema.String,
  studied: Schema.Boolean,
  /** ISO date of the last edit to the title or text */
  updatedAt: Schema.String,
  /** Drawn as a module on the map; nothing else changes */
  module: Schema.optional(Schema.Boolean),
  /** How a module or the root shows on the map; pages below a module take its colour */
  color: Schema.optional(PageColor),
  icon: Schema.optional(PageIcon)
})
export type Page = typeof Page.Type

export const Path = Schema.Struct({
  id: PathId,
  /** Always the root page's title */
  title: Schema.String,
  /** One line on what the map covers, shown under its title */
  description: Schema.optional(Schema.String),
  kind: PathKind,
  pages: Schema.Array(Page),
  /** The single page at the centre of the map */
  rootPageId: PageId,
  visibility: PathVisibility,
  /** What whoever reads it may do with it; its pages' studied marks are that reader's too */
  access: PathAccess
})
export type Path = typeof Path.Type
