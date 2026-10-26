import { Effect, Schema } from "effect"
import { PageNotFound, RootPageProtected, TitleTaken } from "./errors"
import { PageColor, PageIcon, PageId, PathId, PathKind } from "./Path"
import type { Page, Path } from "./Path"
import { createPage, deletePage, findPageByTitle, newPath, renameLinks, setDescription, setKind, setLook, titleTaken, updatePage } from "./rules"
import { lookOf, mapTree, nextPage, pathProgress } from "./tree"
import { linksOf, withLinkTo } from "./links"
import { PathAccess, PathVisibility } from "./access"
import { ProjectId } from "../projects/Project"

/**
 * Commands
 * Every change to a path as a command: a schema for what it carries and a
 * function that applies it or says why it can't. The web applies them to its
 * draft right away and the API applies the same ones to the stored path,
 * so both always agree on the result.
 */

/** Ids are made by the client (a UUID), so a page can open before the server answers */
const idChecks = [Schema.isMinLength(1), Schema.isMaxLength(64)] as const
const Title = Schema.String.check(Schema.isMaxLength(200))
/** A page's title (a map's is its root page's): [ or ] in it would end the [[Title]] links to it */
const PageTitle = Title.check(Schema.isPattern(/^[^[\]]*$/, { message: "Leave [ and ] out of the title" }))

/** A new map, in one of the learner's projects: its root page carries the title */
export const NewPath = Schema.Struct({
  id: PathId.check(...idChecks),
  projectId: ProjectId,
  rootPageId: PageId.check(...idChecks),
  title: PageTitle.check(Schema.isMinLength(1, { message: "Give the map a name" })),
  /** A study unless said otherwise */
  kind: Schema.optional(PathKind)
})
export type NewPath = typeof NewPath.Type

/** What can change on the map itself; its title is its root page's */
export const PathEdit = Schema.Struct({
  description: Schema.optional(Schema.String.check(Schema.isMaxLength(500))),
  kind: Schema.optional(PathKind),
  /** Moves the map to another of the learner's projects; the map itself doesn't change */
  projectId: Schema.optional(ProjectId)
})
export type PathEdit = typeof PathEdit.Type

/** The page a [[link]] points to, created when the link is first followed */
export const NewPage = Schema.Struct({
  id: PageId.check(...idChecks),
  title: PageTitle.check(Schema.isMinLength(1))
})
export type NewPage = typeof NewPage.Type

/** Any edit to one page; fields left out stay as they are */
export const PageEdit = Schema.Struct({
  title: Schema.optional(PageTitle),
  content: Schema.optional(Schema.String),
  studied: Schema.optional(Schema.Boolean),
  /** The reader's own notes on the page; empty removes them */
  notes: Schema.optional(Schema.String),
  module: Schema.optional(Schema.Boolean),
  color: Schema.optional(PageColor),
  icon: Schema.optional(PageIcon),
  /** After a rename: [[links]] still written with this title move to the new one. Not held to PageTitle, so a
   *  title from before [ and ] were refused can be renamed away */
  previousTitle: Schema.optional(Title)
})
export type PageEdit = typeof PageEdit.Type

/** A map as the list of maps shows it */
export const PathSummary = Schema.Struct({
  id: PathId,
  /** The project it is filed in; null for a path from others (shared with the reader, or taken) */
  projectId: Schema.NullOr(ProjectId),
  /** Who owns a path from others; null for the reader's own (or an owner with no name) */
  ownerName: Schema.NullOr(Schema.String),
  visibility: PathVisibility,
  access: PathAccess,
  title: Schema.String,
  description: Schema.optional(Schema.String),
  color: PageColor,
  icon: PageIcon,
  kind: PathKind,
  studied: Schema.Number,
  total: Schema.Number,
  modules: Schema.Number,
  /** Pages no link reaches */
  orphans: Schema.Number,
  /** Where "Continue" leads, if anything is left to study; never set for a study */
  next: Schema.NullOr(Schema.Struct({ id: PageId, title: Schema.String }))
})
export type PathSummary = typeof PathSummary.Type

export function startPath(command: NewPath, now = new Date()): Path {
  return newPath(command.id, command.title, command.rootPageId, now, command.kind)
}

export function editPath(path: Path, edit: PathEdit): Path {
  let next = path
  if (edit.description !== undefined) next = setDescription(next, edit.description)
  if (edit.kind !== undefined) next = setKind(next, edit.kind)
  return next
}

/**
 * Adds a page. Sending the same page twice (a retry) changes nothing; a title
 * another page has is refused.
 */
export const addPage = Effect.fnUntraced(function*(path: Path, command: NewPage, now = new Date()) {
  const same = path.pages.find((p) => p.id === command.id)
  if (same) return { path, page: same }
  if (titleTaken(path, command.id, command.title)) return yield* new TitleTaken({ title: command.title })
  return createPage(path, command.title, command.id, now)
})

/**
 * Adds a page branching from another, as the map's + does: a new page, unless
 * one already has the name (then that one is linked), and a [[Name]] line at
 * the end of the parent's text, which is what puts it on the map. A blank name,
 * the parent's own name, or a page it links already change nothing.
 */
export const addBranch = Effect.fnUntraced(function*(path: Path, parentId: PageId, title: string, id: PageId, now = new Date()) {
  const parent = path.pages.find((p) => p.id === parentId)
  if (!parent) return yield* new PageNotFound({ pageId: parentId })
  const name = title.trim()
  if (!name) return { path, page: null, created: false }
  const added = yield* addPage(path, { id, title: name }, now).pipe(
    Effect.catchTag("TitleTaken", () => Effect.succeed({ path, page: findPageByTitle(path.pages, name)! }))
  )
  const created = added.page.id === id && !path.pages.some((p) => p.id === id)
  if (added.page.id === parentId || linksOf(added.path, parentId).includes(added.page.id)) return { path: added.path, page: added.page, created }
  const linked = yield* editPage(added.path, parentId, { content: withLinkTo(parent.content, added.page.title.trim()) }, now)
  return { path: linked, page: added.page, created }
})

/**
 * Edits a page: its text, whether it was studied, the reader's notes, how it shows on the map,
 * and, after a rename, the [[links]] that used its old title.
 */
export const editPage = Effect.fnUntraced(function*(path: Path, pageId: PageId, edit: PageEdit, now = new Date()) {
  const page = path.pages.find((p) => p.id === pageId)
  if (!page) return yield* new PageNotFound({ pageId })
  if (edit.title !== undefined && titleTaken(path, pageId, edit.title)) return yield* new TitleTaken({ title: edit.title })

  const { title, content, studied, notes, module, color, icon, previousTitle } = edit
  const text = defined({ title, content, studied, notes })
  const look = defined({ module, color, icon })

  let next = updatePage(path, pageId, text, now)
  if (Object.keys(look).length > 0) next = setLook(next, pageId, look)
  if (previousTitle !== undefined) next = renameLinks(next, previousTitle, title ?? page.title)
  return next
})

/** The fields that were given; an edit leaves the others as they are */
const defined = <T extends object>(fields: T): { [K in keyof T]?: Exclude<T[K], undefined> } =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as never

/** Removes a page; one already gone (a retry) changes nothing. The root stays. */
export const removePage = Effect.fnUntraced(function*(path: Path, pageId: PageId) {
  if (pageId === path.rootPageId) return yield* new RootPageProtected({ pageId })
  return path.pages.some((p) => p.id === pageId) ? deletePage(path, pageId) : path
})

/** The map as its card and the sidebar show it */
export function summarize(path: Path, projectId: ProjectId | null, ownerName: string | null): PathSummary {
  const tree = mapTree(path)
  const look = lookOf(path, path.rootPageId, tree)
  // A study has nothing to continue
  const next = path.kind === "learningPath" ? nextPage(path) : undefined
  return {
    id: path.id,
    projectId,
    ownerName,
    visibility: path.visibility,
    access: path.access,
    title: path.title,
    ...(path.description !== undefined ? { description: path.description } : {}),
    color: look.color,
    icon: look.icon,
    kind: path.kind,
    ...pathProgress(path),
    modules: [...tree.nodes.values()].filter((n) => n.page.module).length,
    orphans: tree.orphans.length,
    next: next ? { id: next.id, title: next.title } : null
  }
}

/** A copy of a map with fresh ids, its [[links]] untouched (they use titles) */
export function copyPath(template: Path, id: PathId, newPageId: () => PageId): Path {
  const ids = new Map(template.pages.map((p) => [p.id, newPageId()]))
  return {
    ...template,
    id,
    rootPageId: ids.get(template.rootPageId)!,
    pages: template.pages.map((p) => ({ ...p, id: ids.get(p.id)! }))
  }
}
