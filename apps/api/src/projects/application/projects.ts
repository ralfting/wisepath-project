import { randomUUID } from "node:crypto"
import { Effect, Option } from "effect"
import {
  PageId,
  ProjectId,
  ProjectNotFound,
  addPage,
  copyProject,
  editPage,
  editProject,
  removePage,
  sampleProject,
  startProject,
  summarize
} from "@wisepath/domain/projects"
import type { NewPage, NewProject, PageEdit, Project, ProjectEdit } from "@wisepath/domain/projects"
import { CurrentUser } from "./CurrentUser"
import { ProjectStore } from "./ProjectStore"

/**
 * Project use cases: each loads the owner's map, applies the domain command
 * (the same function the web applies to its draft) and stores the change, in
 * one transaction that holds the map so commands on it never interleave.
 */

/** Every account gets a copy of the sample map, once */
const seedSample = Effect.fn("projects.seedSample")(function*() {
  const user = yield* CurrentUser
  const store = yield* ProjectStore
  yield* store.transaction(
    Effect.gen(function*() {
      if (!(yield* store.claimSample(user.id))) return
      const copy = copyProject(sampleProject, ProjectId.make(randomUUID()), () => PageId.make(randomUUID()))
      yield* store.insert(user.id, copy)
    })
  )
})

export const listProjects = Effect.fn("projects.list")(function*() {
  const user = yield* CurrentUser
  const store = yield* ProjectStore
  yield* seedSample()
  const projects = yield* store.listOwned(user.id)
  return projects.map(summarize)
})

export const getProject = Effect.fn("projects.get")(function*(id: ProjectId) {
  const user = yield* CurrentUser
  const store = yield* ProjectStore
  return yield* store.find(user.id, id).pipe(
    Effect.flatMap(Option.match({
      onNone: () => Effect.fail(new ProjectNotFound({ projectId: id })),
      onSome: Effect.succeed
    }))
  )
})

/** Creating the same map twice (a retry) returns the one already made */
export const createProject = Effect.fn("projects.create")(function*(command: NewProject) {
  const user = yield* CurrentUser
  const store = yield* ProjectStore
  const project = startProject(command)
  if (yield* store.insert(user.id, project)) return project
  const existing = yield* store.find(user.id, command.id)
  if (Option.isSome(existing)) return existing.value
  return yield* Effect.die(new Error(`Project id ${command.id} is already used by another account`))
})

export const removeProject = Effect.fn("projects.remove")(function*(id: ProjectId) {
  const user = yield* CurrentUser
  const store = yield* ProjectStore
  yield* store.remove(user.id, id)
})

/** Loads the map, applies one command and stores what it changed */
const change = <E>(id: ProjectId, apply: (project: Project) => Effect.Effect<Project, E>) =>
  Effect.gen(function*() {
    const user = yield* CurrentUser
    const store = yield* ProjectStore
    return yield* store.transaction(
      Effect.gen(function*() {
        const found = yield* store.find(user.id, id, { lock: true })
        if (Option.isNone(found)) return yield* new ProjectNotFound({ projectId: id })
        const after = yield* apply(found.value)
        if (after !== found.value) yield* store.save(found.value, after)
        return after
      })
    )
  })

export const updateProject = Effect.fn("projects.update")(function*(id: ProjectId, edit: ProjectEdit) {
  yield* change(id, (project) => Effect.succeed(editProject(project, edit)))
})

export const createPage = Effect.fn("projects.createPage")(function*(id: ProjectId, command: NewPage) {
  const project = yield* change(id, (p) => addPage(p, command).pipe(Effect.map((r) => r.project)))
  return project.pages.find((p) => p.id === command.id)!
})

export const updatePage = Effect.fn("projects.updatePage")(function*(id: ProjectId, pageId: PageId, edit: PageEdit) {
  yield* change(id, (project) => editPage(project, pageId, edit))
})

export const deletePage = Effect.fn("projects.deletePage")(function*(id: ProjectId, pageId: PageId) {
  yield* change(id, (project) => removePage(project, pageId))
})
