import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Ref, SubscriptionRef } from "effect"
import {
  PageId,
  ProjectNotFound,
  ProjectRepository,
  ProjectsUnavailable,
  addPage,
  editPage,
  editProject,
  removePage,
  sampleProject,
  summarize
} from "@wisepath/domain/projects"
import type { Project } from "@wisepath/domain/projects"
import { openProjectSession } from "./sync"
import type { SyncState } from "./sync"

/**
 * The sync session against an API kept in memory, which applies commands with
 * the same domain functions the real one uses and can be made to fail.
 */

interface Api {
  readonly project: Ref.Ref<Project>
  /** Calls that reached the API, in order */
  readonly calls: Ref.Ref<ReadonlyArray<string>>
  /** How many of the next calls fail as if the connection dropped */
  readonly dropNext: Ref.Ref<number>
}

const memoryApi = Effect.gen(function*() {
  const project = yield* Ref.make<Project>(sampleProject)
  const calls = yield* Ref.make<ReadonlyArray<string>>([])
  const dropNext = yield* Ref.make(0)
  const api: Api = { project, calls, dropNext }

  const call = <A, E>(name: string, run: (p: Project) => Effect.Effect<readonly [A, Project], E>) =>
    Effect.gen(function*() {
      if ((yield* Ref.get(dropNext)) > 0) {
        yield* Ref.update(dropNext, (n) => n - 1)
        return yield* new ProjectsUnavailable({ cause: "connection dropped" })
      }
      yield* Ref.update(calls, (c) => [...c, name])
      const [value, next] = yield* run(yield* Ref.get(project))
      yield* Ref.set(project, next)
      return value
    })
  const same = (id: string) => (id === sampleProject.id ? Effect.void : Effect.fail(new ProjectNotFound({ projectId: id })))

  const layer = Layer.succeed(ProjectRepository)(ProjectRepository.of({
    list: Ref.get(project).pipe(Effect.map((p) => [summarize(p)])),
    get: (id) => same(id).pipe(Effect.andThen(Ref.get(project))),
    create: () => Effect.die("not used"),
    update: (_id, edit) => call("update", (p) => Effect.succeed([undefined, editProject(p, edit)] as const)),
    remove: () => Effect.die("not used"),
    createPage: (_id, page) =>
      call("createPage", (p) => addPage(p, page).pipe(Effect.map((r) => [r.page, r.project] as const))),
    updatePage: (_id, pageId, edit) =>
      call(`updatePage:${Object.keys(edit).sort().join(",")}`, (p) => editPage(p, pageId, edit).pipe(Effect.map((n) => [undefined, n] as const))),
    removePage: (_id, pageId) =>
      call("removePage", (p) => removePage(p, pageId).pipe(Effect.map((n) => [undefined, n] as const)))
  }))
  return { api, layer }
})

const page = (project: Project, id: string) => project.pages.find((p) => p.id === id)

/** Waits until every change reached the API */
const settled = (state: SubscriptionRef.SubscriptionRef<SyncState>) =>
  Effect.gen(function*() {
    while ((yield* SubscriptionRef.get(state)).status !== "saved") yield* Effect.sleep("20 millis")
  })

describe("project sync", () => {
  it.live("shows a change at once and sends a burst of typing as one edit", () =>
    Effect.gen(function*() {
      const { api, layer } = yield* memoryApi
      yield* Effect.gen(function*() {
        const session = yield* openProjectSession(sampleProject.id)
        assert.isTrue(session.dispatch({ _tag: "UpdatePage", pageId: PageId.make("guards"), edit: { content: "G" } }))
        session.dispatch({ _tag: "UpdatePage", pageId: PageId.make("guards"), edit: { content: "Gu" } })
        session.dispatch({ _tag: "UpdatePage", pageId: PageId.make("guards"), edit: { content: "Guards" } })
        const shown = yield* SubscriptionRef.get(session.state)
        assert.strictEqual(page(shown.project, "guards")?.content, "Guards")
        assert.strictEqual(shown.status, "saving")
        yield* settled(session.state)
        assert.deepStrictEqual(yield* Ref.get(api.calls), ["updatePage:content"])
        assert.strictEqual(page(yield* Ref.get(api.project), "guards")?.content, "Guards")
      }).pipe(Effect.scoped, Effect.provide(layer))
    }))

  it.live("sends commands in order: a new page, then its text", () =>
    Effect.gen(function*() {
      const { api, layer } = yield* memoryApi
      yield* Effect.gen(function*() {
        const session = yield* openProjectSession(sampleProject.id)
        const id = PageId.make("new-page")
        session.dispatch({ _tag: "CreatePage", page: { id, title: "Pipes 2" } })
        session.dispatch({ _tag: "UpdatePage", pageId: id, edit: { content: "Hello" } })
        session.dispatch({ _tag: "UpdatePage", pageId: id, edit: { studied: true } })
        yield* settled(session.state)
        assert.deepStrictEqual(yield* Ref.get(api.calls), ["createPage", "updatePage:content,studied"])
        assert.strictEqual(page(yield* Ref.get(api.project), "new-page")?.content, "Hello")
      }).pipe(Effect.scoped, Effect.provide(layer))
    }))

  it.live("keeps a change while offline and sends it once the API is back", () =>
    Effect.gen(function*() {
      const { api, layer } = yield* memoryApi
      yield* Effect.gen(function*() {
        const session = yield* openProjectSession(sampleProject.id)
        yield* Ref.set(api.dropNext, 2)
        session.dispatch({ _tag: "RemovePage", pageId: PageId.make("jwt") })
        yield* Effect.sleep("100 millis")
        assert.strictEqual((yield* SubscriptionRef.get(session.state)).status, "offline")
        yield* settled(session.state)
        assert.deepStrictEqual(yield* Ref.get(api.calls), ["removePage"])
        assert.isUndefined(page(yield* Ref.get(api.project), "jwt"))
      }).pipe(Effect.scoped, Effect.provide(layer))
    }))

  it.live("undoes a change the API refuses and keeps the ones after it", () =>
    Effect.gen(function*() {
      const { api, layer } = yield* memoryApi
      yield* Effect.gen(function*() {
        const session = yield* openProjectSession(sampleProject.id)
        // Another tab takes the title first
        yield* Ref.update(api.project, (p) => ({ ...p, pages: p.pages.map((x) => (x.id === "pipes" ? { ...x, title: "Filters" } : x)) }))
        session.dispatch({ _tag: "UpdatePage", pageId: PageId.make("guards"), edit: { title: "Filters" } })
        session.dispatch({ _tag: "UpdatePage", pageId: PageId.make("scopes"), edit: { studied: true } })
        yield* settled(session.state)
        const shown = yield* SubscriptionRef.get(session.state)
        assert.strictEqual(page(shown.project, "guards")?.title, "Guards")
        assert.strictEqual(page(shown.project, "pipes")?.title, "Filters")
        assert.isTrue(page(shown.project, "scopes")?.studied)
        assert.strictEqual(shown.notice, "titleTaken")
      }).pipe(Effect.scoped, Effect.provide(layer))
    }))

  it.effect("says when the map does not exist", () =>
    Effect.gen(function*() {
      const { layer } = yield* memoryApi
      const error = yield* Effect.flip(openProjectSession(sampleProject.id.replace("nestjs", "other") as never).pipe(Effect.scoped, Effect.provide(layer)))
      assert.strictEqual(error._tag, "ProjectNotFound")
    }))
})
