import { Effect, Option } from "effect"
import {
  LinkPreviews,
  PageId,
  ProjectNotFound,
  ProjectRepository,
  findSampleProject,
  sampleProjects
} from "@wisepath/domain/projects"
import type { Project, ProjectId } from "@wisepath/domain/projects"

/**
 * Project use cases as Effect programs. Editing itself is pure domain rules
 * applied in the hooks; these programs cover what touches services.
 */

/** The saved copy of a project, or the shipped sample when nothing was saved yet */
export const loadProject = Effect.fn("useCases.projects.load")(function*(id: ProjectId) {
  const saved = yield* ProjectRepository.use((repo) => repo.load(id))
  if (Option.isSome(saved)) return saved.value
  const sample = findSampleProject(id)
  if (!sample) return yield* new ProjectNotFound({ projectId: id })
  return sample
})

/** Saves after a short pause; a newer save started meanwhile replaces this one */
export const saveProject = Effect.fn("useCases.projects.save")(function*(project: Project) {
  yield* Effect.sleep("300 millis")
  yield* ProjectRepository.use((repo) => repo.save(project))
})

/** Every project the learner has, with their saved progress */
export const listProjects = Effect.forEach(sampleProjects, (project) => loadProject(project.id))

/** A fresh id for a new page */
export const newPageId = (): PageId =>
  PageId.make(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `page-${Date.now().toString(36)}`)

/** What an external link says about itself */
export const previewLink = (url: string) => LinkPreviews.use((previews) => previews.preview(url))
