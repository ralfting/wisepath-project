import { Schema } from "effect"
import { PathAccess, PathLanguage, PathVisibility, PublicationStatus } from "./access"
import { PageNote } from "./notes"
import { ActivityId, Answer } from "./activities"

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
  /** The reader's own notes on the page, oldest first, never anyone else's; absent when they have none */
  notes: Schema.optional(Schema.Array(PageNote)),
  /** The activities in its text the reader ticked done, never anyone else's; absent when they have none */
  done: Schema.optional(Schema.Array(ActivityId)),
  /** The reader's answers to the questions in its text, never anyone else's; absent when they have written none */
  answers: Schema.optional(Schema.Array(Answer)),
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
  /** What whoever reads it may do with it; its pages' studied marks, ticks, answers and notes are that reader's too */
  access: PathAccess,
  /** The owner's name, for a signed-in reader who is not the owner; absent for the owner, a visitor with no account, or an owner with no name */
  ownerName: Schema.optional(Schema.String),
  /** Who the path is for, in one line, as the owner told the catalog */
  audience: Schema.optional(Schema.String),
  language: Schema.optional(PathLanguage),
  /** A request to publish it, for its owner only: waiting, or declined */
  publication: Schema.optional(PublicationStatus),
  /** Its address in the catalog (/p/<slug>), given when it is first published and kept after */
  slug: Schema.optional(Schema.String)
})
export type Path = typeof Path.Type
