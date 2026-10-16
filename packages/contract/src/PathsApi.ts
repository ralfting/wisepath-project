import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { NotAuthenticated } from "@wisepath/domain/auth"
import {
  NewPage,
  NewPath,
  Page,
  PageEdit,
  PageId,
  PageNotFound,
  Path,
  PathEdit,
  PathId,
  PathNotFound,
  PathSummary,
  RootPageProtected,
  TitleTaken
} from "@wisepath/domain/paths"
import { ProjectNotFound } from "@wisepath/domain/projects"
import { InvalidRequest } from "./InvalidRequest"

/**
 * The learner's maps and their pages (under /api/paths). Every endpoint
 * needs the session cookie and only sees its owner's maps; someone else's map
 * answers PathNotFound, as if it did not exist.
 *
 * Each change is one command from the domain (NewPage, PageEdit, …), and
 * sending one twice changes nothing more, so a client can retry freely.
 * Domain errors travel as their own JSON (`{ "_tag": "TitleTaken", ... }`)
 * with the status they declare.
 */

/** Every endpoint needs a session */
const SessionRequired = NotAuthenticated

const path = { pathId: PathId }
const page = { pathId: PathId, pageId: PageId }

export class PathsApiGroup extends HttpApiGroup.make("paths")
  .add(
    HttpApiEndpoint.get("list", "/", {
      success: Schema.Array(PathSummary),
      error: [SessionRequired]
    }),
    HttpApiEndpoint.post("create", "/", {
      payload: NewPath,
      success: Path.pipe(HttpApiSchema.status(201)),
      error: [SessionRequired, InvalidRequest, ProjectNotFound]
    }),
    HttpApiEndpoint.get("get", "/:pathId", {
      params: path,
      success: Path,
      error: [SessionRequired, PathNotFound]
    }),
    HttpApiEndpoint.patch("update", "/:pathId", {
      params: path,
      payload: PathEdit,
      error: [SessionRequired, InvalidRequest, PathNotFound, ProjectNotFound]
    }),
    HttpApiEndpoint.delete("remove", "/:pathId", {
      params: path,
      error: [SessionRequired]
    }),
    HttpApiEndpoint.post("createPage", "/:pathId/pages", {
      params: path,
      payload: NewPage,
      success: Page.pipe(HttpApiSchema.status(201)),
      error: [SessionRequired, InvalidRequest, PathNotFound, TitleTaken]
    }),
    HttpApiEndpoint.patch("updatePage", "/:pathId/pages/:pageId", {
      params: page,
      payload: PageEdit,
      error: [SessionRequired, InvalidRequest, PathNotFound, PageNotFound, TitleTaken, RootPageProtected]
    }),
    HttpApiEndpoint.delete("removePage", "/:pathId/pages/:pageId", {
      params: page,
      error: [SessionRequired, PathNotFound, RootPageProtected]
    })
  )
  .prefix("/paths") {}
