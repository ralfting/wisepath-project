import { Schema } from "effect"

/** There is no project with this id */
export class ProjectNotFound extends Schema.TaggedError<ProjectNotFound>()("ProjectNotFound", {
  projectId: Schema.String
}) {}

/** Saved projects could not be read or written */
export class ProjectStorageError extends Schema.TaggedError<ProjectStorageError>()("ProjectStorageError", {
  cause: Schema.Defect()
}) {}
