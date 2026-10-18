import { Effect, Schema } from "effect"
import { AccessNotices, LinkPreviews, NewPath, NoticeId, PageId, PathId, PathKind, PathRepository, PathSharing, LinkVisibility, PublicationRequest, PublicationReview, ShareEdit } from "@wisepath/domain/paths"
import { UserId } from "@wisepath/domain/auth"
import { ProjectId } from "@wisepath/domain/projects"

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

/** A map as the learner may read it, from an id that came from the URL */
export const readPath = Effect.fn("useCases.paths.read")(function*(pathId: string) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  return yield* PathRepository.use((repo) => repo.get(id))
})

/**
 * A new map named after its root page, in one of the learner's projects: a study, or a learning path. What is sent
 * is decoded with the domain's NewPath, so the form and the Server Action get the same answer
 */
export const createPath = Effect.fn("useCases.paths.create")(function*(input: {
  readonly title: string
  readonly kind: string
  readonly projectId: string
}) {
  const command = yield* Schema.decodeUnknownEffect(NewPath)({
    id: newId(),
    projectId: input.projectId,
    rootPageId: newId(),
    title: input.title.trim(),
    kind: input.kind
  })
  return yield* PathRepository.use((repo) => repo.create(command))
})

/** Files a map in another project; the map itself doesn't change */
export const movePath = Effect.fn("useCases.paths.move")(function*(pathId: string, projectId: string) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  const to = yield* Schema.decodeUnknownEffect(ProjectId)(projectId)
  yield* PathRepository.use((repo) => repo.update(id, { projectId: to }))
})

/** Turns a map that isn't open into a study or a learning path */
export const setPathKind = Effect.fn("useCases.paths.setKind")(function*(pathId: string, kind: string) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  const to = yield* Schema.decodeUnknownEffect(PathKind)(kind)
  yield* PathRepository.use((repo) => repo.update(id, { kind: to }))
})

/** The learner's copy of the sample path, offered on a first visit */
export const takeSample = PathRepository.use((repo) => repo.takeSample).pipe(Effect.withSpan("useCases.paths.takeSample"))

export const removePath = Effect.fn("useCases.paths.remove")(function*(pathId: string) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  yield* PathRepository.use((repo) => repo.remove(id))
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

/** Drops an invite still waiting for someone to sign up with its email */
export const cancelInvite = Effect.fn("useCases.paths.cancelInvite")(function*(pathId: string, email: string) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  const address = yield* Schema.decodeUnknownEffect(Schema.String)(email)
  yield* PathSharing.use((sharing) => sharing.cancelInvite(id, address))
})

/** Makes a map public, readable by anyone with its link, or private again */
export const setVisibility = Effect.fn("useCases.paths.setVisibility")(function*(pathId: string, visibility: string) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  const to = yield* Schema.decodeUnknownEffect(LinkVisibility)(visibility)
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

/** A published map by its catalog address, which came from the URL */
export const readPublishedPath = Effect.fn("useCases.paths.readPublished")(function*(slug: string) {
  const address = yield* Schema.decodeUnknownEffect(Schema.String)(slug)
  return yield* PathSharing.use((sharing) => sharing.readPublished(address))
})

/** Every published map's address and its pages', for the sitemap */
export const listCatalog = PathSharing.use((sharing) => sharing.catalog()).pipe(Effect.withSpan("useCases.paths.listCatalog"))

/** The learner's notices of paths they lost */
export const listNotices = AccessNotices.use((notices) => notices.list).pipe(Effect.withSpan("useCases.paths.notices"))

/** A notice once shown */
export const dismissNotice = Effect.fn("useCases.paths.dismissNotice")(function*(noticeId: string) {
  const id = yield* Schema.decodeUnknownEffect(NoticeId)(noticeId)
  yield* AccessNotices.use((notices) => notices.dismiss(id))
})

/** Asks to publish a map to the catalog, from what the owner typed: what it teaches, who it is for, its language */
export const requestPublication = Effect.fn("useCases.paths.requestPublication")(function*(pathId: string, input: unknown) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  const request = yield* Schema.decodeUnknownEffect(PublicationRequest)(input)
  yield* PathSharing.use((sharing) => sharing.requestPublication(id, request))
})

/** Withdraws a request to publish, or takes a published map out of the catalog */
export const withdrawPublication = Effect.fn("useCases.paths.withdrawPublication")(function*(pathId: string) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  yield* PathSharing.use((sharing) => sharing.withdrawPublication(id))
})

/** The requests to publish waiting for an administrator */
export const pendingPublications = PublicationReview.use((review) => review.pending()).pipe(
  Effect.withSpan("useCases.paths.pendingPublications")
)

/** An administrator approves a request to publish, or declines it */
export const decidePublication = Effect.fn("useCases.paths.decidePublication")(function*(pathId: string, approve: boolean) {
  const id = yield* Schema.decodeUnknownEffect(PathId)(pathId)
  yield* PublicationReview.use((review) => (approve ? review.approve(id) : review.decline(id)))
})
