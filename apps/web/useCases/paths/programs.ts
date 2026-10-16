import { Effect } from "effect"
import { LinkPreviews, PageId, PathId, PathRepository } from "@wisepath/domain/paths"
import type { PathKind } from "@wisepath/domain/paths"

/**
 * Path use cases as Effect programs, for what isn't an edit of an open map
 * (those go through sync.ts): the list of maps, making and deleting one, and
 * switching the kind of one that isn't open.
 */

/** A fresh id; ids are made here so a new page or map can open before the API answers */
const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export const newPageId = (): PageId => PageId.make(newId())

/** Every map the learner has, as their cards show them */
export const listPaths = PathRepository.use((repo) => repo.list).pipe(Effect.withSpan("useCases.paths.list"))

/** A new map named after its root page: a study, or a learning path */
export const createPath = Effect.fn("useCases.paths.create")(function*(input: { readonly title: string; readonly kind: PathKind }) {
  const repo = yield* PathRepository
  return yield* repo.create({ id: PathId.make(newId()), rootPageId: newPageId(), title: input.title.trim(), kind: input.kind })
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
