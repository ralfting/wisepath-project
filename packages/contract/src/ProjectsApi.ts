import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { NotAuthenticated } from "@wisepath/domain/auth"
import { DefaultProjectProtected, NewProject, Project, ProjectEdit, ProjectId, ProjectNotFound } from "@wisepath/domain/projects"
import { InvalidRequest } from "./InvalidRequest"

/**
 * The learner's projects, which group their paths (under /api/projects).
 * Every endpoint needs the session cookie and only sees its owner's
 * projects; someone else's answers ProjectNotFound, as if it did not exist.
 * The list always holds the default project, made the first time it is asked for.
 */

/** Every endpoint needs a session */
const SessionRequired = NotAuthenticated

const project = { projectId: ProjectId }

export class ProjectsApiGroup extends HttpApiGroup.make("projects")
  .add(
    /** The default first, then by name */
    HttpApiEndpoint.get("list", "/", {
      success: Schema.Array(Project),
      error: [SessionRequired]
    }),
    /** Creating the same project twice (a retry) returns the one already made */
    HttpApiEndpoint.post("create", "/", {
      payload: NewProject,
      success: Project.pipe(HttpApiSchema.status(201)),
      error: [SessionRequired, InvalidRequest]
    }),
    HttpApiEndpoint.patch("rename", "/:projectId", {
      params: project,
      payload: ProjectEdit,
      error: [SessionRequired, InvalidRequest, ProjectNotFound]
    }),
    /** Its paths move to the default project; one already gone changes nothing */
    HttpApiEndpoint.delete("remove", "/:projectId", {
      params: project,
      error: [SessionRequired, DefaultProjectProtected]
    })
  )
  .prefix("/projects") {}
