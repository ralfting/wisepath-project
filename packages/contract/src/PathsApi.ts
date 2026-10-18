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
  PathSummary,
  PendingPublication,
  PublicationRequest,
  NotAdmin,
  RootPageProtected,
  ShareEdit,
  ShareResult,
  SharedWith,
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

/** A download of Markdown files, zipped */
const MarkdownZip = Schema.Uint8Array.pipe(HttpApiSchema.asUint8Array({ contentType: "application/zip" }))

export class PathsApiGroup extends HttpApiGroup.make("paths")
  .add(
    HttpApiEndpoint.get("list", "/", {
      success: Schema.Array(PathSummary),
      error: [SessionRequired]
    }),
    /** The paths the learner owns as Markdown, one folder each, in a zip; others' paths are never copied out */
    HttpApiEndpoint.get("exportAll", "/export", {
      success: MarkdownZip,
      error: [SessionRequired]
    }),
    HttpApiEndpoint.post("create", "/", {
      payload: NewPath,
      success: Path.pipe(HttpApiSchema.status(201)),
      error: [SessionRequired, InvalidRequest, ProjectNotFound]
    }),
    /** The learner's copy of the sample path, in their language and default project; asking again returns it */
    HttpApiEndpoint.post("takeSample", "/sample", {
      success: Path.pipe(HttpApiSchema.status(201)),
      error: [SessionRequired]
    }),
    HttpApiEndpoint.get("get", "/:pathId", {
      params: path,
      success: Path,
      error: [SessionRequired, PathNotFound]
    }),
    /** One path the learner owns as Markdown, one file per page, in a zip */
    HttpApiEndpoint.get("export", "/:pathId/export", {
      params: path,
      success: MarkdownZip,
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
    /** The people the owner invited and the emails waiting for a sign up, for the owner only; takers are never listed */
    HttpApiEndpoint.get("shares", "/:pathId/shares", {
      params: path,
      success: SharedWith,
      error: [SessionRequired, PathNotFound]
    }),
    /**
     * Shares by email, or changes the role: with the account that has it, or as an invite that becomes a membership
     * when someone signs up with it (WisePath sends no email)
     */
    HttpApiEndpoint.put("share", "/:pathId/shares", {
      params: path,
      payload: ShareEdit,
      success: ShareResult,
      error: [SessionRequired, InvalidRequest, PathNotFound, CannotShareWithSelf]
    }),
    /** Drops an invite still waiting for a sign up */
    HttpApiEndpoint.delete("cancelInvite", "/:pathId/invites", {
      params: path,
      query: { email: Schema.String },
      error: [SessionRequired, PathNotFound]
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
    /**
     * The owner tells the catalog what the map teaches, who it is for and its language; a map not yet published
     * waits for an administrator to approve it, keeping its visibility meanwhile
     */
    HttpApiEndpoint.put("requestPublication", "/:pathId/publication", {
      params: path,
      payload: PublicationRequest,
      error: [SessionRequired, InvalidRequest, PathNotFound]
    }),
    /** Withdraws the request, or takes a published map out of the catalog, leaving it readable by its link */
    HttpApiEndpoint.delete("withdrawPublication", "/:pathId/publication", {
      params: path,
      error: [SessionRequired, PathNotFound]
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

/**
 * Requests to publish maps to the catalog (under /api/admin/publications), for WisePath's administrators only;
 * anyone else gets NotAdmin, answered as not found. A request no longer waiting answers PathNotFound.
 */
export class AdminApiGroup extends HttpApiGroup.make("admin")
  .add(
    HttpApiEndpoint.get("publications", "/publications", {
      success: Schema.Array(PendingPublication),
      error: [SessionRequired, NotAdmin]
    }),
    HttpApiEndpoint.post("approve", "/publications/:pathId/approve", {
      params: path,
      error: [SessionRequired, NotAdmin, PathNotFound]
    }),
    HttpApiEndpoint.post("decline", "/publications/:pathId/decline", {
      params: path,
      error: [SessionRequired, NotAdmin, PathNotFound]
    })
  )
  .prefix("/admin") {}

/**
 * The catalog, read without a session (under /api/public/catalog): a published map by its address, as a visitor
 * reads it. Anything not published answers PathNotFound.
 */
export class CatalogApiGroup extends HttpApiGroup.make("catalog")
  .add(
    HttpApiEndpoint.get("get", "/:slug", {
      params: { slug: Schema.String },
      success: Path,
      error: [PathNotFound]
    })
  )
  .prefix("/public/catalog") {}
