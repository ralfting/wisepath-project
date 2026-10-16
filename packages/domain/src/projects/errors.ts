import { Schema } from "effect"

/**
 * What can go wrong with a project. Each error says which HTTP status the API
 * answers it with, so the contract and the server agree on it.
 */

/** There is no project with this id, or it belongs to someone else */
export class ProjectNotFound extends Schema.TaggedError<ProjectNotFound>()("ProjectNotFound", {
  projectId: Schema.String
}, { httpApiStatus: 404 }) {}

/** The default project takes the paths of deleted ones, so it can't be deleted itself */
export class DefaultProjectProtected extends Schema.TaggedError<DefaultProjectProtected>()("DefaultProjectProtected", {
  projectId: Schema.String
}, { httpApiStatus: 422 }) {}

/** Projects could not be reached right now (network, server down); trying again may work */
export class ProjectsUnavailable extends Schema.TaggedError<ProjectsUnavailable>()("ProjectsUnavailable", {
  cause: Schema.Defect()
}) {}
