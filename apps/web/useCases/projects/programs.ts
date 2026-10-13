import { Effect } from "effect"
import { LinkPreviews, PageId, ProjectId, ProjectRepository } from "@wisepath/domain/projects"

/**
 * Project use cases as Effect programs, for what isn't an edit of an open map
 * (those go through sync.ts): the list of maps, making and deleting one.
 */

/** A fresh id; ids are made here so a new page or map can open before the API answers */
const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export const newPageId = (): PageId => PageId.make(newId())

/** Every map the learner has, as their cards show them */
export const listProjects = ProjectRepository.use((repo) => repo.list).pipe(Effect.withSpan("useCases.projects.list"))

/** A new map named after its root page */
export const createProject = Effect.fn("useCases.projects.create")(function*(title: string) {
  const repo = yield* ProjectRepository
  return yield* repo.create({ id: ProjectId.make(newId()), rootPageId: newPageId(), title: title.trim() })
})

export const removeProject = Effect.fn("useCases.projects.remove")(function*(id: ProjectId) {
  const repo = yield* ProjectRepository
  yield* repo.remove(id)
})

/** What an external link says about itself */
export const previewLink = (url: string) => LinkPreviews.use((previews) => previews.preview(url))
