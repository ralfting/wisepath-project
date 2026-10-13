import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { NotAuthenticated } from "@wisepath/domain/auth"
import {
  NewPage,
  NewProject,
  Page,
  PageEdit,
  PageId,
  PageNotFound,
  Project,
  ProjectEdit,
  ProjectId,
  ProjectNotFound,
  ProjectSummary,
  RootPageProtected,
  TitleTaken
} from "@wisepath/domain/projects"
import { nestError } from "./nestError"

/**
 * The learner's maps and their pages (under /api/projects). Every endpoint
 * needs the session cookie and only sees its owner's maps; someone else's map
 * answers ProjectNotFound, as if it did not exist.
 *
 * Each change is one command from the domain (NewPage, PageEdit, …), and
 * sending one twice changes nothing more, so a client can retry freely.
 * Domain errors travel as their own JSON (`{ "_tag": "TitleTaken", ... }`)
 * with the status they declare.
 */

/** The request did not match the contract: a missing field, a wrong type */
export class InvalidRequest extends Schema.TaggedError<InvalidRequest>()("InvalidRequest", {
  message: Schema.String
}, { httpApiStatus: 400 }) {}

/** The session guard answers in NestJS's own format */
const SessionRequired = nestError(NotAuthenticated, 401, () => new NotAuthenticated())

const project = { projectId: ProjectId }
const page = { projectId: ProjectId, pageId: PageId }

export class ProjectsApiGroup extends HttpApiGroup.make("projects")
  .add(
    HttpApiEndpoint.get("list", "/", {
      success: Schema.Array(ProjectSummary),
      error: [SessionRequired]
    }),
    HttpApiEndpoint.post("create", "/", {
      payload: NewProject,
      success: Project.pipe(HttpApiSchema.status(201)),
      error: [SessionRequired, InvalidRequest]
    }),
    HttpApiEndpoint.get("get", "/:projectId", {
      params: project,
      success: Project,
      error: [SessionRequired, ProjectNotFound]
    }),
    HttpApiEndpoint.patch("update", "/:projectId", {
      params: project,
      payload: ProjectEdit,
      error: [SessionRequired, InvalidRequest, ProjectNotFound]
    }),
    HttpApiEndpoint.delete("remove", "/:projectId", {
      params: project,
      error: [SessionRequired]
    }),
    HttpApiEndpoint.post("createPage", "/:projectId/pages", {
      params: project,
      payload: NewPage,
      success: Page.pipe(HttpApiSchema.status(201)),
      error: [SessionRequired, InvalidRequest, ProjectNotFound, TitleTaken]
    }),
    HttpApiEndpoint.patch("updatePage", "/:projectId/pages/:pageId", {
      params: page,
      payload: PageEdit,
      error: [SessionRequired, InvalidRequest, ProjectNotFound, PageNotFound, TitleTaken, RootPageProtected]
    }),
    HttpApiEndpoint.delete("removePage", "/:projectId/pages/:pageId", {
      params: page,
      error: [SessionRequired, ProjectNotFound, RootPageProtected]
    })
  )
  .prefix("/projects") {}
