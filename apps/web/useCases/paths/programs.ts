import { Effect, Schema } from "effect"
import { LinkPreviews, PageId, PathId, PathRepository, PathSharing, PathVisibility, ShareEdit } from "@wisepath/domain/paths"
import { UserId } from "@wisepath/domain/auth"
import type { PathKind } from "@wisepath/domain/paths"
import type { ProjectId } from "@wisepath/domain/projects"

/**
 * Path use cases as Effect programs, for what isn't an edit of an open map
 * (those go through sync.ts): the list of maps, making and deleting one,
 * switching the kind of one that isn't open, and sharing them.
 */

/** A fresh id; ids are made here so a new page or map can open before the API answers */
export const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export const newPageId = (): PageId => PageId.make(newId())

/** Every map the learner has, as their cards show them */
export const listPaths = PathRepository.use((repo) => repo.list).pipe(Effect.withSpan("useCases.paths.list"))

/** A map's title, from an id that came from the URL */
export const pathTitle = Effect.fn("useCases.paths.title")(function*(pathId: string) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  const path = yield* PathRepository.use((repo) => repo.get(id))
  return path.title
})

/** A new map named after its root page, in one of the learner's projects: a study, or a learning path */
export const createPath = Effect.fn("useCases.paths.create")(function*(input: {
  readonly title: string
  readonly kind: PathKind
  readonly projectId: ProjectId
}) {
  const repo = yield* PathRepository
  return yield* repo.create({
    id: PathId.make(newId()),
    projectId: input.projectId,
    rootPageId: newPageId(),
    title: input.title.trim(),
    kind: input.kind
  })
})

/** Files a map in another project; the map itself doesn't change */
export const movePath = Effect.fn("useCases.paths.move")(function*(input: { readonly id: PathId; readonly projectId: ProjectId }) {
  const repo = yield* PathRepository
  yield* repo.update(input.id, { projectId: input.projectId })
})

/** Turns a map that isn't open into a study or a learning path */
export const setPathKind = Effect.fn("useCases.paths.setKind")(function*(input: { readonly id: PathId; readonly kind: PathKind }) {
  const repo = yield* PathRepository
  yield* repo.update(input.id, { kind: input.kind })
})

export const removePath = Effect.fn("useCases.paths.remove")(function*(id: PathId) {
  const repo = yield* PathRepository
  yield* repo.remove(id)
})

/** What an external link says about itself */
export const previewLink = (url: string) => LinkPreviews.use((previews) => previews.preview(url))

/** The people the owner invited to a map */
export const listShares = (id: PathId) => PathSharing.use((sharing) => sharing.shares(id)).pipe(Effect.withSpan("useCases.paths.shares"))

/** Invites an account by email to read or edit a map, or changes their role; what is sent is decoded first */
export const sharePath = Effect.fn("useCases.paths.share")(function*(pathId: string, input: { readonly email: string; readonly role: string }) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  const edit = yield* Schema.decodeUnknownEffect(ShareEdit)(input)
  return yield* PathSharing.use((sharing) => sharing.share(id, edit))
})

/** The owner takes someone off a map */
export const unsharePath = Effect.fn("useCases.paths.unshare")(function*(pathId: string, userId: string) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  const member = yield* Schema.decodeUnknownEffect(UserId)(userId)
  yield* PathSharing.use((sharing) => sharing.unshare(id, member))
})

/** Makes a map public, readable by anyone with its link, or private again */
export const setVisibility = Effect.fn("useCases.paths.setVisibility")(function*(pathId: string, visibility: string) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  const to = yield* Schema.decodeUnknownEffect(PathVisibility)(visibility)
  yield* PathSharing.use((sharing) => sharing.setVisibility(id, { visibility: to }))
})

/** Adds a public map to the learner's maps, to study it with their own marks */
export const takePath = Effect.fn("useCases.paths.take")(function*(pathId: string) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  yield* PathSharing.use((sharing) => sharing.take(id))
})

/** Leaves a map from others; the learner's marks on it go too */
export const leavePath = Effect.fn("useCases.paths.leave")(function*(pathId: string) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  yield* PathSharing.use((sharing) => sharing.leave(id))
})

/** A public map as someone with no account reads it, from an id that came from the URL */
export const readPublicPath = Effect.fn("useCases.paths.readPublic")(function*(pathId: string) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  return yield* PathSharing.use((sharing) => sharing.readPublic(id))
})
