---
paths:
  - "apps/web/useCases/**"
  - "apps/web/infrastructure/**"
  - "apps/web/**/actions.ts"
  - "apps/web/app/**/route.ts"
  - "packages/domain/**"
  - "packages/contract/**"
---

# Effect (level c: end to end, runtime only at the edge)

Effect 4.0.3. API names differ from Effect 3: `Context.Service` (not `Effect.Service`/`Context.Tag`),
`Schema.decodeUnknownEffect`, `Effect.catch` (not `catchAll`), `effect/reactivity` for atoms. Check
`node_modules/effect/dist/*.d.ts` before using an API from memory.

## Schema is the source of truth

- `import { Schema } from "effect"`. The type derives from the schema: `export type Project = typeof Project.Type`.
  Never write an `interface` or `type` that restates a schema's fields.
  ```ts
  // Wrong
  interface Project { id: string; name: string; isDefault: boolean }
  // Right (packages/domain/src/projects/Project.ts)
  export const Project = Schema.Struct({ id: ProjectId, name: Schema.String, isDefault: Schema.Boolean })
  export type Project = typeof Project.Type
  ```
- Validation messages live in the schema (`Schema.isMinLength(1, { message: "Give the project a name" })`) and are
  translated in the UI through `useDomainMessage` (`useCases/validation.ts`). Add each new message there.
- Branded ids for every id (`ProjectId`, `PathId`, `PageId`, `UserId`) and for values with an invariant when mixing
  two would be a bug. `X.make(value)` only for values already trusted (from the API client); decode anything else.

## Decode at every boundary

Data from outside is `unknown` until decoded; inside programs and the domain it is trusted.

| Boundary | Decode with | Where |
|---|---|---|
| Form or Server Action payload | `Schema.decodeUnknownEffect(Input)(payload)` | First line of the program or action |
| `params` / `searchParams` | A route params schema | The page or the `queries.ts` it calls |
| API responses | The contract (`HttpApiClient` decodes) | `infrastructure/` |
| `localStorage`, `postMessage`, clipboard, URL hash | `Schema.decodeUnknownOption`/`Effect` | The use case or Layer that reads it |
| Env vars | Literal `process.env.X` reads | `infrastructure/http/ApiClient.ts` (browser-safe), `infrastructure/server/ServerApiClient.ts` (server-only) |

**Why env reads stay literal:** Next inlines `process.env.NEXT_PUBLIC_*` only when written literally; Effect `Config`
reading `process.env` dynamically gets `undefined` in the client bundle. Use `Config` only for server-only vars.

## Tagged errors

- Expected failures are `Schema.TaggedError` in `packages/domain/src/<domain>/errors.ts`, with `httpApiStatus` when the
  API answers them. **Why Schema and not `Data.TaggedError`:** they cross the wire (contract, Server Action results).
- Fail with `return yield* new TitleTaken({ title })`. `throw` and `Effect.die` are for defects only.
- Handle with `Effect.catchTag` / `Effect.catchTags`. `Effect.catch` is allowed in one place: the `classify` helper of
  `Http*` Layers, which re-fails domain errors, maps retryable ones to `<Domain>Unavailable` and dies on the rest.
  ```ts
  // Wrong: try/catch loses the type and swallows defects
  try { await api.rename(...) } catch { return null }
  // Right
  repo.rename(id, edit).pipe(Effect.catchTag("ProjectNotFound", () => Effect.succeed(null)))
  ```

## Services and Layers

- Service interface in the domain: `class ProjectRepository extends Context.Service<ProjectRepository, {...}>()("@wisepath/domain/projects/ProjectRepository") {}`.
  Every method returns `Effect.Effect<A, E>` with its errors listed.
- Implementations in `infrastructure/<domain>/`: `Http<Service>` as `Layer.effect(Service, Effect.gen(...))` returning
  `Service.of({...})`, each method with `Effect.withSpan("<Service>.<method>")`; `Memory<Service>` beside it for tests.
- Programs and the domain never build a client (`HttpApiClient.make`, `fetch`). They `yield*` the service.
- Client wiring: `infrastructure/AppLayer.ts` merges every client Layer. Server wiring:
  `infrastructure/server/ServerLayer.ts` builds the same services per request over `requestApiClient(cookie)`
  (`infrastructure/server/ServerApiClient.ts`), which sends that request's `cookie` header to `serverBaseUrl(...)`:
  `API_ORIGIN` when set, the one the production rewrite targets; else `NEXT_PUBLIC_API_URL` when absolute. `ServerServices` lists what it provides: add a
  service there (and its server Layer, like `ServerPathRepository`) when a query needs it.
- A Layer whose reads are guarded with `inBrowser` (`Effect.never` during the server render of client components)
  gets a server twin without the guard, from the same `make`, as `HttpPathRepository` / `ServerPathRepository` do.

## The edge: where an Effect runs

| Edge | Runs with | File |
|---|---|---|
| Client hook | `appRuntime.atom(...)` / `appRuntime.fn(..., { reactivityKeys })` | `useCases/<domain>/<domain>.ts` |
| Server read | `runServer(program)` (`useCases/server.ts`) over `runOnServer` (`infrastructure/server/ServerLayer.ts`, the one run ESLint allows in infrastructure): the request's cookies, `ServerLayer`, a shared `ManagedRuntime` holding only the HTTP client; returns an `Exit` | `useCases/<domain>/queries.ts` (`useCases/paths/queries.ts`); the program itself in `programs.ts` |
| Server Action / route handler | `runAction(program)` over `runServer`, mapped to `ActionResult` | `useCases/<domain>/actions.ts`, `app/**/route.ts` (target: first action adds `runAction`) |
| Test | `it.effect(...)` + `Effect.provide(MemoryX(...))` | `*.test.ts` |

- The request's cookie header is read by `runServer` from `cookies()` and goes into `ServerLayer(cookie)`, built per
  call; it never goes into the shared runtime or a module variable. **Why:** the runtime is shared across requests;
  a cookie in it would leak one learner's session into another's request. `ServerLayer.test.ts` pins this with
  overlapping requests on one shared runtime.
- Never call `Effect.runPromise`/`runSync`/`runFork` in a program, a Layer, the domain or a component.
  ```ts
  // Wrong: runs inside a service, outside the caller's runtime, errors become rejections
  list: Effect.promise(() => Effect.runPromise(fetchAll()))
  // Right
  list: fetchAll()
  ```

## Composition

- Programs: `Effect.fn("useCases.<domain>.<verb>")(function*(input) { ... })`; one-liners: `Service.use((s) => s.x)`.
- `Effect.gen` for sequences, `pipe` for short transforms. Never nest `Effect.gen` in `Effect.gen` without a reason.
- Concurrency is explicit: `Effect.all([a, b], { concurrency: 2 })` or `"unbounded"` with a why. The default is sequential.
- Retries and timeouts belong in the Layer (`HttpClient.retryTransient`), not in programs.

## Error to UI

- Client: `messageFor(exit, { Tag: t("…") }, t("common.errors.generic"))` from `useCases/messages.ts`, passed through
  `useDomainMessage`. Every tag a hook can fail with is mapped or falls to the generic message on purpose.
- Server Action: one `toActionResult` at the edge returns
  `{ ok: true; value: A } | { ok: false; _tag: E["_tag"]; message: string }` with `message` already translated
  (`serverT`). This replaces the per-domain `ProjectActionResult` when actions land.
- Never send `cause`, stack traces or `Schema.Defect` fields to the client. `<Domain>Unavailable` carries a `cause`;
  map it to `common.errors.unavailable`.

## Reactivity and cache

- Mutation atoms declare every `ReactivityKeys` they change (`useCases/runtime.ts`); deleting a project also refreshes `paths`.
- Server Actions call `revalidateTag` with the same key names, so client atoms and server renders refresh the same set.
  Add new keys to `ReactivityKeys`, never as string literals.
- No atom hydration yet: hydrated atoms that use `Atom.withReactivity` refetch after hydration
  ([Effect #8398](https://github.com/Effect-TS/effect/issues/8398)), and all of ours do. Server data reaches client
  components as props. Revisit when the issue is closed.

## Pre-flight checklist

- [ ] Every type with a schema derives from it; no parallel interface.
- [ ] External input decoded with `Schema.decodeUnknown*` before use.
- [ ] New failures are `Schema.TaggedError` in the domain; no `throw`, no `try/catch` around Effects.
- [ ] Errors handled with `catchTag(s)`; no `Effect.catch` outside `classify`.
- [ ] Programs `yield*` services; no client built outside `infrastructure/`.
- [ ] `run*` only at an edge from the table; request data never stored in a runtime.
- [ ] Mutations declare `reactivityKeys` / `revalidateTag` from `ReactivityKeys`.
- [ ] Errors reach the UI translated, without `cause` or stack.
