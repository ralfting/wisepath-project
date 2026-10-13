import { Effect, Schema } from "effect"
import { PageNotFound, RootPageProtected, TitleTaken } from "./errors"
import { PageColor, PageIcon, PageId, ProjectId } from "./Project"
import type { Page, Project } from "./Project"
import { createPage, deletePage, newProject, renameLinks, setDescription, setLook, titleTaken, updatePage } from "./rules"
import { lookOf, nextPage, projectProgress } from "./tree"

/**
 * Commands
 * Every change to a project as a command: a schema for what it carries and a
 * function that applies it or says why it can't. The web applies them to its
 * draft right away and the API applies the same ones to the stored project,
 * so both always agree on the result.
 */

/** Ids are made by the client (a UUID), so a page can open before the server answers */
const idChecks = [Schema.isMinLength(1), Schema.isMaxLength(64)] as const
const Title = Schema.String.check(Schema.isMaxLength(200))

/** A new map: its root page carries the title */
export const NewProject = Schema.Struct({
  id: ProjectId.check(...idChecks),
  rootPageId: PageId.check(...idChecks),
  title: Title.check(Schema.isMinLength(1, { message: "Give the map a name" }))
})
export type NewProject = typeof NewProject.Type

/** What can change on the map itself; its title is its root page's */
export const ProjectEdit = Schema.Struct({
  description: Schema.optional(Schema.String.check(Schema.isMaxLength(500)))
})
export type ProjectEdit = typeof ProjectEdit.Type

/** The page a [[link]] points to, created when the link is first followed */
export const NewPage = Schema.Struct({
  id: PageId.check(...idChecks),
  title: Title.check(Schema.isMinLength(1))
})
export type NewPage = typeof NewPage.Type

/** Any edit to one page; fields left out stay as they are */
export const PageEdit = Schema.Struct({
  title: Schema.optional(Title),
  content: Schema.optional(Schema.String),
  studied: Schema.optional(Schema.Boolean),
  module: Schema.optional(Schema.Boolean),
  color: Schema.optional(PageColor),
  icon: Schema.optional(PageIcon),
  /** After a rename: [[links]] still written with this title move to the new one */
  previousTitle: Schema.optional(Title)
})
export type PageEdit = typeof PageEdit.Type

/** A map as the list of maps shows it */
export const ProjectSummary = Schema.Struct({
  id: ProjectId,
  title: Schema.String,
  description: Schema.optional(Schema.String),
  color: PageColor,
  icon: PageIcon,
  studied: Schema.Number,
  total: Schema.Number,
  /** Where "Continue" leads, if anything is left to study */
  next: Schema.NullOr(Schema.Struct({ id: PageId, title: Schema.String }))
})
export type ProjectSummary = typeof ProjectSummary.Type

export function startProject(command: NewProject, now = new Date()): Project {
  return newProject(command.id, command.title, command.rootPageId, now)
}

export const editProject = (project: Project, edit: ProjectEdit): Project =>
  edit.description === undefined ? project : setDescription(project, edit.description)

/**
 * Adds a page. Sending the same page twice (a retry) changes nothing; a title
 * another page has is refused.
 */
export const addPage = Effect.fnUntraced(function*(project: Project, command: NewPage, now = new Date()) {
  const same = project.pages.find((p) => p.id === command.id)
  if (same) return { project, page: same }
  if (titleTaken(project, command.id, command.title)) return yield* new TitleTaken({ title: command.title })
  return createPage(project, command.title, command.id, now)
})

/**
 * Edits a page: its text, whether it was studied, how it shows on the map,
 * and, after a rename, the [[links]] that used its old title.
 */
export const editPage = Effect.fnUntraced(function*(project: Project, pageId: PageId, edit: PageEdit, now = new Date()) {
  const page = project.pages.find((p) => p.id === pageId)
  if (!page) return yield* new PageNotFound({ pageId })
  if (edit.studied !== undefined && pageId === project.rootPageId) return yield* new RootPageProtected({ pageId })
  if (edit.title !== undefined && titleTaken(project, pageId, edit.title)) return yield* new TitleTaken({ title: edit.title })

  const { title, content, studied, module, color, icon, previousTitle } = edit
  const text = defined({ title, content, studied })
  const look = defined({ module, color, icon })

  let next = updatePage(project, pageId, text, now)
  if (Object.keys(look).length > 0) next = setLook(next, pageId, look)
  if (previousTitle !== undefined) next = renameLinks(next, previousTitle, title ?? page.title)
  return next
})

/** The fields that were given; an edit leaves the others as they are */
const defined = <T extends object>(fields: T): { [K in keyof T]?: Exclude<T[K], undefined> } =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as never

/** Removes a page; one already gone (a retry) changes nothing. The root stays. */
export const removePage = Effect.fnUntraced(function*(project: Project, pageId: PageId) {
  if (pageId === project.rootPageId) return yield* new RootPageProtected({ pageId })
  return project.pages.some((p) => p.id === pageId) ? deletePage(project, pageId) : project
})

/** The map as its card and the sidebar show it */
export function summarize(project: Project): ProjectSummary {
  const look = lookOf(project, project.rootPageId)
  const next = nextPage(project)
  return {
    id: project.id,
    title: project.title,
    ...(project.description !== undefined ? { description: project.description } : {}),
    color: look.color,
    icon: look.icon,
    ...projectProgress(project),
    next: next ? { id: next.id, title: next.title } : null
  }
}

/** A copy of a map with fresh ids, its [[links]] untouched (they use titles) */
export function copyProject(template: Project, id: ProjectId, newPageId: () => PageId): Project {
  const ids = new Map(template.pages.map((p) => [p.id, newPageId()]))
  return {
    ...template,
    id,
    rootPageId: ids.get(template.rootPageId)!,
    pages: template.pages.map((p) => ({ ...p, id: ids.get(p.id)! }))
  }
}
