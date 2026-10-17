import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { NotAuthenticated, UserId } from "@wisepath/domain/auth"
import {
  CannotShareWithSelf,
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
  PathShare,
  PathSummary,
  RootPageProtected,
  ShareEdit,
  ShareTargetNotFound,
  TitleTaken,
  VisibilityEdit
} from "@wisepath/domain/paths"
import { ProjectNotFound } from "@wisepath/domain/projects"
import { InvalidRequest } from "./InvalidRequest"

/**
 * The learner's maps and their pages (under /api/paths). Every endpoint
 * needs the session cookie. A map answers with what its reader may do with it
 * (its `access`): reading includes marking pages studied, which are the
 * reader's own marks; editing pages needs an editor; the rest needs the owner.
 * Without the access needed a map answers PathNotFound, as if it did not exist.
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
const member = { pathId: PathId, userId: UserId }

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
    }),
    /** The people the owner invited, for the owner only; who took a public map is never listed */
    HttpApiEndpoint.get("shares", "/:pathId/shares", {
      params: path,
      success: Schema.Array(PathShare),
      error: [SessionRequired, PathNotFound]
    }),
    /** Invites an account by email, or changes the role of someone invited */
    HttpApiEndpoint.put("share", "/:pathId/shares", {
      params: path,
      payload: ShareEdit,
      success: PathShare,
      error: [SessionRequired, InvalidRequest, PathNotFound, ShareTargetNotFound, CannotShareWithSelf]
    }),
    /** The owner removes someone, or a member leaves (their own id); their marks on the map go too */
    HttpApiEndpoint.delete("unshare", "/:pathId/shares/:userId", {
      params: member,
      error: [SessionRequired, PathNotFound]
    }),
    /** The reader leaves a map that is not theirs (shared with them, or taken); their marks on it go too */
    HttpApiEndpoint.delete("leave", "/:pathId/membership", {
      params: path,
      error: [SessionRequired, PathNotFound]
    }),
    /** Making a map private removes those who took it, and their marks */
    HttpApiEndpoint.patch("setVisibility", "/:pathId/visibility", {
      params: path,
      payload: VisibilityEdit,
      error: [SessionRequired, InvalidRequest, PathNotFound]
    }),
    /** Adds a public map to the reader's maps, to study it with their own marks; never a copy */
    HttpApiEndpoint.post("take", "/:pathId/take", {
      params: path,
      error: [SessionRequired, PathNotFound]
    })
  )
  .prefix("/paths") {}

/**
 * Public maps, read without a session (under /api/public/paths): a map its
 * owner made public, as a reader with no account sees it (no marks). A private
 * map answers PathNotFound. Nothing here writes.
 */
export class PublicPathsApiGroup extends HttpApiGroup.make("publicPaths")
  .add(
    HttpApiEndpoint.get("get", "/:pathId", {
      params: path,
      success: Path,
      error: [PathNotFound]
    })
  )
  .prefix("/public/paths") {}
