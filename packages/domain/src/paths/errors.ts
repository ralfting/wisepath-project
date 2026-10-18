import { Schema } from "effect"

/**
 * What can go wrong with a path. Each error says which HTTP status the API
 * answers it with, so the contract and the server agree on it.
 */

/** There is no path with this id, or it belongs to someone else */
export class PathNotFound extends Schema.TaggedError<PathNotFound>()("PathNotFound", {
  pathId: Schema.String
}, { httpApiStatus: 404 }) {}

/** The path has no page with this id */
export class PageNotFound extends Schema.TaggedError<PageNotFound>()("PageNotFound", {
  pageId: Schema.String
}, { httpApiStatus: 404 }) {}

/** Another page of the path already has this title, so [[links]] to it would be ambiguous */
export class TitleTaken extends Schema.TaggedError<TitleTaken>()("TitleTaken", {
  title: Schema.String
}, { httpApiStatus: 409 }) {}

/** The root page names the map: it can't be deleted or marked studied */
export class RootPageProtected extends Schema.TaggedError<RootPageProtected>()("RootPageProtected", {
  pageId: Schema.String
}, { httpApiStatus: 422 }) {}

/** The owner tried to share a path with themselves */
export class CannotShareWithSelf extends Schema.TaggedError<CannotShareWithSelf>()("CannotShareWithSelf", {}, {
  httpApiStatus: 422
}) {}

/** Paths could not be reached right now (network, server down); trying again may work */
export class PathsUnavailable extends Schema.TaggedError<PathsUnavailable>()("PathsUnavailable", {
  cause: Schema.Defect()
}) {}
