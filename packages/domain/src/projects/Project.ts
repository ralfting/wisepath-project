import { Schema } from "effect"
import type { Locale } from "../auth/User"

/**
 * A project groups a user's paths ("Work", "Languages"). Every path is in
 * one. Each user has one default project, made with the account: it can be
 * renamed but not deleted, and takes the paths of a project that is.
 */

export const ProjectId = Schema.String.pipe(Schema.brand("ProjectId"))
export type ProjectId = typeof ProjectId.Type

export const Project = Schema.Struct({
  id: ProjectId,
  name: Schema.String,
  isDefault: Schema.Boolean
})
export type Project = typeof Project.Type

/** Ids are made by the client (a UUID), like paths' */
const idChecks = [Schema.isMinLength(1), Schema.isMaxLength(64)] as const
const Name = Schema.Trim.check(Schema.isMinLength(1, { message: "Give the project a name" }), Schema.isMaxLength(100))

export const NewProject = Schema.Struct({
  id: ProjectId.check(...idChecks),
  name: Name
})
export type NewProject = typeof NewProject.Type

export const ProjectEdit = Schema.Struct({
  name: Name
})
export type ProjectEdit = typeof ProjectEdit.Type

/** The default project's name when it is made, in the account's language; none follows the browser, so English */
export const defaultProjectName = (locale: Locale | null | undefined): string => (locale === "pt-BR" ? "Geral" : "General")

/** How projects are listed: the default first, then by name */
export const sortProjects = (projects: ReadonlyArray<Project>): ReadonlyArray<Project> =>
  [...projects].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
