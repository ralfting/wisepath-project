import { Schema } from "effect"

/**
 * What can go wrong with a project. Each error says which HTTP status the API
 * answers it with, so the contract and the server agree on it.
 */

/** There is no project with this id, or it belongs to someone else */
export class ProjectNotFound extends Schema.TaggedError<ProjectNotFound>()("ProjectNotFound", {
  projectId: Schema.String
}, { httpApiStatus: 404 }) {}

/** The project has no page with this id */
export class PageNotFound extends Schema.TaggedError<PageNotFound>()("PageNotFound", {
  pageId: Schema.String
}, { httpApiStatus: 404 }) {}

/** Another page of the project already has this title, so [[links]] to it would be ambiguous */
export class TitleTaken extends Schema.TaggedError<TitleTaken>()("TitleTaken", {
  title: Schema.String
}, { httpApiStatus: 409 }) {}

/** The root page names the map: it can't be deleted or marked studied */
export class RootPageProtected extends Schema.TaggedError<RootPageProtected>()("RootPageProtected", {
  pageId: Schema.String
}, { httpApiStatus: 422 }) {}

/** Projects could not be reached right now (network, server down); trying again may work */
export class ProjectsUnavailable extends Schema.TaggedError<ProjectsUnavailable>()("ProjectsUnavailable", {
  cause: Schema.Defect()
}) {}
