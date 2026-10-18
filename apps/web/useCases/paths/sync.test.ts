import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Ref, SubscriptionRef } from "effect"
import {
  PageId,
  PathNotFound,
  PathRepository,
  PathsUnavailable,
  addPage,
  editPage,
  editPath,
  removePage,
  samplePath,
  summarize
} from "@wisepath/domain/paths"
import type { Path } from "@wisepath/domain/paths"
import { ProjectId } from "@wisepath/domain/projects"
import { openPathSession } from "./sync"
import type { SyncState } from "./sync"

/**
 * The sync session against an API kept in memory, which applies commands with
 * the same domain functions the real one uses and can be made to fail.
 */

interface Api {
  readonly path: Ref.Ref<Path>
  /** Calls that reached the API, in order */
  readonly calls: Ref.Ref<ReadonlyArray<string>>
  /** How many of the next calls fail as if the connection dropped */
  readonly dropNext: Ref.Ref<number>
}

const memoryApi = (start: Path) => Effect.gen(function*() {
  const path = yield* Ref.make<Path>(start)
  const calls = yield* Ref.make<ReadonlyArray<string>>([])
  const dropNext = yield* Ref.make(0)
  const api: Api = { path, calls, dropNext }

  const call = <A, E>(name: string, run: (p: Path) => Effect.Effect<readonly [A, Path], E>) =>
    Effect.gen(function*() {
      if ((yield* Ref.get(dropNext)) > 0) {
        yield* Ref.update(dropNext, (n) => n - 1)
        return yield* new PathsUnavailable({ cause: "connection dropped" })
      }
      yield* Ref.update(calls, (c) => [...c, name])
      const [value, next] = yield* run(yield* Ref.get(path))
      yield* Ref.set(path, next)
      return value
    })
  const same = (id: string) => (id === samplePath.id ? Effect.void : Effect.fail(new PathNotFound({ pathId: id })))

  const layer = Layer.succeed(PathRepository)(PathRepository.of({
    list: Ref.get(path).pipe(Effect.map((p) => [summarize(p, ProjectId.make("general"), null)])),
    get: (id) => same(id).pipe(Effect.andThen(Ref.get(path))),
    create: () => Effect.die("not used"),
    update: (_id, edit) => call("update", (p) => Effect.succeed([undefined, editPath(p, edit)] as const)),
    remove: () => Effect.die("not used"),
    takeSample: Effect.die("not used"),
    createPage: (_id, page) =>
      call("createPage", (p) => addPage(p, page).pipe(Effect.map((r) => [r.page, r.path] as const))),
    updatePage: (_id, pageId, edit) =>
      call(`updatePage:${Object.keys(edit).sort().join(",")}`, (p) => editPage(p, pageId, edit).pipe(Effect.map((n) => [undefined, n] as const))),
    removePage: (_id, pageId) =>
      call("removePage", (p) => removePage(p, pageId).pipe(Effect.map((n) => [undefined, n] as const)))
  }))
  return { api, layer }
})

const page = (path: Path, id: string) => path.pages.find((p) => p.id === id)

/** Waits until every change reached the API */
const settled = (state: SubscriptionRef.SubscriptionRef<SyncState>) =>
  Effect.gen(function*() {
    while ((yield* SubscriptionRef.get(state)).status !== "saved") yield* Effect.sleep("20 millis")
  })

describe("path sync", () => {
  it.live("shows a change at once and sends a burst of typing as one edit", () =>
    Effect.gen(function*() {
      const { api, layer } = yield* memoryApi(samplePath)
      yield* Effect.gen(function*() {
        const session = yield* openPathSession(samplePath.id)
        assert.isTrue(session.dispatch({ _tag: "UpdatePage", pageId: PageId.make("guards"), edit: { content: "G" } }))
        session.dispatch({ _tag: "UpdatePage", pageId: PageId.make("guards"), edit: { content: "Gu" } })
        session.dispatch({ _tag: "UpdatePage", pageId: PageId.make("guards"), edit: { content: "Guards" } })
        const shown = yield* SubscriptionRef.get(session.state)
        assert.strictEqual(page(shown.path, "guards")?.content, "Guards")
        assert.strictEqual(shown.status, "saving")
        yield* settled(session.state)
        assert.deepStrictEqual(yield* Ref.get(api.calls), ["updatePage:content"])
        assert.strictEqual(page(yield* Ref.get(api.path), "guards")?.content, "Guards")
      }).pipe(Effect.scoped, Effect.provide(layer))
    }))

  it.live("sends commands in order: a new page, then its text", () =>
    Effect.gen(function*() {
      const { api, layer } = yield* memoryApi(samplePath)
      yield* Effect.gen(function*() {
        const session = yield* openPathSession(samplePath.id)
        const id = PageId.make("new-page")
        session.dispatch({ _tag: "CreatePage", page: { id, title: "Pipes 2" } })
        session.dispatch({ _tag: "UpdatePage", pageId: id, edit: { content: "Hello" } })
        session.dispatch({ _tag: "UpdatePage", pageId: id, edit: { studied: true } })
        yield* settled(session.state)
        assert.deepStrictEqual(yield* Ref.get(api.calls), ["createPage", "updatePage:content,studied"])
        assert.strictEqual(page(yield* Ref.get(api.path), "new-page")?.content, "Hello")
      }).pipe(Effect.scoped, Effect.provide(layer))
    }))

  it.live("keeps a change while offline and sends it once the API is back", () =>
    Effect.gen(function*() {
      const { api, layer } = yield* memoryApi(samplePath)
      yield* Effect.gen(function*() {
        const session = yield* openPathSession(samplePath.id)
        yield* Ref.set(api.dropNext, 2)
        session.dispatch({ _tag: "RemovePage", pageId: PageId.make("jwt") })
        yield* Effect.sleep("100 millis")
        assert.strictEqual((yield* SubscriptionRef.get(session.state)).status, "offline")
        yield* settled(session.state)
        assert.deepStrictEqual(yield* Ref.get(api.calls), ["removePage"])
        assert.isUndefined(page(yield* Ref.get(api.path), "jwt"))
      }).pipe(Effect.scoped, Effect.provide(layer))
    }))

  it.live("undoes a change the API refuses and keeps the ones after it", () =>
    Effect.gen(function*() {
      const { api, layer } = yield* memoryApi(samplePath)
      yield* Effect.gen(function*() {
        const session = yield* openPathSession(samplePath.id)
        // Another tab takes the title first
        yield* Ref.update(api.path, (p) => ({ ...p, pages: p.pages.map((x) => (x.id === "pipes" ? { ...x, title: "Filters" } : x)) }))
        session.dispatch({ _tag: "UpdatePage", pageId: PageId.make("guards"), edit: { title: "Filters" } })
        session.dispatch({ _tag: "UpdatePage", pageId: PageId.make("scopes"), edit: { studied: true } })
        yield* settled(session.state)
        const shown = yield* SubscriptionRef.get(session.state)
        assert.strictEqual(page(shown.path, "guards")?.title, "Guards")
        assert.strictEqual(page(shown.path, "pipes")?.title, "Filters")
        assert.isTrue(page(shown.path, "scopes")?.studied)
        assert.strictEqual(shown.notice, "titleTaken")
      }).pipe(Effect.scoped, Effect.provide(layer))
    }))

  it.live("lets a reader mark pages studied and nothing else", () =>
    Effect.gen(function*() {
      const { api, layer } = yield* memoryApi({ ...samplePath, access: "viewer" })
      yield* Effect.gen(function*() {
        const session = yield* openPathSession(samplePath.id)
        const tried = [
          session.dispatch({ _tag: "UpdatePage", pageId: PageId.make("guards"), edit: { content: "Mine" } }),
          session.dispatch({ _tag: "CreatePage", page: { id: PageId.make("new"), title: "New" } }),
          session.dispatch({ _tag: "RemovePage", pageId: PageId.make("guards") }),
          session.dispatch({ _tag: "UpdatePath", edit: { kind: "learningPath" } }),
          session.dispatch({ _tag: "UpdatePage", pageId: PageId.make("scopes"), edit: { studied: true } })
        ]
        assert.deepStrictEqual(tried, [false, false, false, false, true])
        yield* settled(session.state)
        assert.deepStrictEqual(yield* Ref.get(api.calls), ["updatePage:studied"])
        assert.strictEqual(page((yield* SubscriptionRef.get(session.state)).path, "guards")?.content, page(samplePath, "guards")?.content)
      }).pipe(Effect.scoped, Effect.provide(layer))
    }))

  it.effect("says when the map does not exist", () =>
    Effect.gen(function*() {
      const { layer } = yield* memoryApi(samplePath)
      const error = yield* Effect.flip(openPathSession(samplePath.id.replace("nestjs", "other") as never).pipe(Effect.scoped, Effect.provide(layer)))
      assert.strictEqual(error._tag, "PathNotFound")
    }))
})
