---
paths:
  - "apps/api/**"
---

# NestJS API (apps/api)

Nest handles HTTP: routes, the session guard, cookies, CORS. What the API does is written in Effect on the same
`@wisepath/domain` the web uses, so both apply a change with the same function. Nest 10, Express, Drizzle 0.45 on
`@effect/sql-pg`, Postgres. Shared rules still apply: [always.md](always.md), [effect.md](effect.md) (schemas, tagged
errors, services), [code-style.md](code-style.md).

## Layers

| Layer | Where | Owns | Never |
|---|---|---|---|
| Application | `src/<module>/application/` | Use cases as `Effect.fn('<module>.<verb>')` programs; ports as `Context.Service` (`ProjectStore`, `PathStore`, `UserStore`, `InboxStore`, `ReviewStore`, `SearchStore`, `PasswordHasher`, `PageFetcher`); `CurrentUser` | Nest, Express, Drizzle, `effect/sql`, anything in `infrastructure/` |
| Infrastructure | `src/<module>/infrastructure/` | Controllers, guards, cookie helpers, `Drizzle<Store>` Layers, third-party adapters | Business rules (they live in the domain or the use case) |
| Module | `src/<module>/<module>.module.ts` | Nest wiring only: controllers and imports | Logic |
| Shared infrastructure | `src/shared/infrastructure/` | `EffectRuntime` (one `ManagedRuntime` over `AppLive`), `SchemaPipe`, `Sql`, `database/` (Drizzle schema, the `@effect/sql` bridge, the migration runner) | Module-specific code |
| Domain | `packages/domain` | Schemas, commands, rules, errors with `httpApiStatus` | - |
| Contract | `packages/contract` | Every endpoint as `HttpApiEndpoint` with its payload, success and errors | - |

Enforced by ESLint (`apps/api/eslint.config.mjs`): `application/**` cannot import `@nestjs/*`, `express`,
`cookie-parser`, `drizzle-orm`, `effect/sql`, `@effect/sql-pg` or `**/infrastructure`. Everywhere: no validation
library but Effect Schema (`class-validator` included), and no `process.env` outside the files listed under Config.

## A request, in order

1. **Guard**: `@UseGuards(JwtAuthGuard)` on every controller except `auth` signup/login/logout and `openapi.json`.
   The guard verifies the token, checks the account still exists, and puts the user on `req.user`.
2. **Decode**: every `@Body`, `@Param` and `@Query` goes through `new SchemaPipe(Schema)` with a domain or contract
   schema. Never read `req.body`/`req.query` raw. Excess properties are rejected (`onExcessProperty: 'error'`).
3. **Run**: `this.effect.run(program.pipe(asUser(req)))` or `this.effect.respond(program, SuccessSchema)` when the
   answer is encoded. `asUser` provides `CurrentUser` per request; it is never in `AppLive`.
4. **Answer**: a domain error becomes the status its schema declares (`httpApiStatus`), body `{ _tag, ...fields }`;
   a defect is logged and answered 500 with no detail. `@HttpCode(204)` for commands with no body, 201 for creates.

```ts
// Wrong: raw input, business rule in the controller, error type lost
@Patch(':projectId')
async rename(@Req() req: Request, @Param('projectId') id: string, @Body() body: { name: string }) {
  if (!body.name) throw new BadRequestException();
  try { await this.effect.run(projects.renameProject(id as ProjectId, body)) } catch { throw new NotFoundException() }
}
// Right
@Patch(':projectId')
@HttpCode(204)
async rename(@Req() req: Request, @Param('projectId', projectId) id: ProjectId, @Body(new SchemaPipe(ProjectEdit)) edit: ProjectEdit) {
  await this.effect.run(projects.renameProject(id, edit).pipe(asUser(req)));
}
```

## The contract is the spec

- An endpoint exists in `packages/contract` before its controller. Path, payload, success schema, status and every
  error it can answer are declared there; the controller mirrors them. **Why:** the web client is generated from
  the contract and the API tests call through it, so a server that drifts fails the tests.
- A new domain error gets `httpApiStatus` in the domain and is listed in the endpoint's `error: [...]`.
- `NotAuthenticated` (401) and `InvalidRequest` (400) are the only errors the infrastructure raises itself.

## Use cases

- Shape: `const user = yield* CurrentUser; const store = yield* XStore;` then the rule, then the store call.
  Every program acts on `user.id` only; another learner's resource is answered as if it did not exist (`XNotFound`).
- Apply changes with the domain's command functions (`addPage`, `editPage`, `startPath`, `summarize`), never with
  logic written in the API. **Why:** the web applies the same command to its draft; two implementations drift.
- Retries are safe: a create sent twice returns what was made; a delete of something gone changes nothing.
  An id reused by another account is a defect (`Effect.die`), not a 4xx.
- Commands on a map run inside `store.transaction(...)` that holds the map, so commands never interleave.
- Storage failures are defects (500 + log), not domain errors. Stores return `Option`/`boolean`, not throw.

## Stores (Drizzle)

- `Drizzle<Store>` is a `Layer.effect(Store, Effect.gen(...))` using `Database`'s `run`, `use` and `transaction`.
  Never call Drizzle outside `run`/`use`: the bridge needs the running fiber (it throws "must run through
  Database.run").
- Map rows to domain values in one `toDomain` per store; branded ids with `X.make(row.id)` (rows are trusted).
- Every query filters by `ownerId`, or for a path goes through `PathStore.find`/`listFor` and the use case checks
  the access it needs ([security.md](security.md), "Authorization"). A query with neither is a review blocker.
- Tables live in `src/shared/infrastructure/database/schema.ts`; relational queries are checked by the compiler.

## Migrations

- Edit `schema.ts`, then `pnpm --filter @wisepath/api db:generate --name <change>`; the container applies it on start.
- Migrations only add: tables, nullable or defaulted columns, indexes. Never drop or rename in the same release.
  **Why:** CI migrates Neon a minute before the new API replaces the old one, which must keep working.
  To remove something: ship code that stops using it, then a migration that drops it.
- Generate the migration last, after rebasing on `main`, so its number follows what is there.

## Config and secrets

- Env vars: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `HOST`, `PORT`, `NODE_ENV`. `jwtSecret()` refuses to start
  in production without a 32+ character secret of its own. Never weaken that check.
- `process.env` is read in `main.ts`, `setup.ts`, `auth.module.ts` (passed to `jwtSecret`) and `session.ts` only;
  `Sql.ts` reads `DATABASE_URL` through Effect `Config.Redacted`. New config goes through `Config`, not `process.env`.
- The session cookie is httpOnly, `sameSite: 'lax'`, `secure` in production, 30 days, renewed by `JwtAuthGuard`
  once a day while it is used (decided 2026-10-18). Bearer tokens are accepted for non-browser clients. Never log a
  token, a password or a request body.
- `SafePageFetcher` resolves DNS and refuses private addresses, caps time, size and redirects. Any new outbound
  fetch of a user-supplied URL goes through it or copies those checks.

## Tests

- Integration, through the real Nest app and Postgres: each `test/<module>.test.ts` calls `useApp()` from
  `test/app.ts`, which boots `AppModule` on a random port and gives clients generated from the contract
  (`makeClient`, `signedIn(name)`, `makeSession` with its cookie jar, `baseUrl()` for raw requests). Each test makes
  its own account, so tests do not share data. Shared fixtures live there too (`generalOf`, `ownedMap`, `outcomes`);
  never copy the app setup into a test file.
- Database: `wisepath_test` on the local Postgres, wiped and migrated by `test/globalSetup.ts`. Override with
  `TEST_DATABASE_URL` whose name ends in `_test`. **Never** point it at `apps/api/.env`'s `DATABASE_URL`.
- One `it.effect` per behaviour, named in product words; assert the error by its `_tag` through the client's typed
  errors. Unit tests only for pure helpers (`jwtSecret`, `readPreview`).
- Commands: `pnpm --filter @wisepath/api test`, one file `cd apps/api && pnpm exec vitest run test/projects.test.ts`,
  typecheck `pnpm --filter @wisepath/api typecheck` (covers `test/` too), lint `pnpm --filter @wisepath/api lint`.

## Style

Single quotes, semicolons, trailing commas, `function* ()` with a space, ~120 columns (prettier-like, hand-kept).
Doc comment on every controller, use case, port and Layer saying what it is for in product terms.

## Pre-flight checklist

- [ ] Endpoint declared in the contract first; controller mirrors path, status, payload and errors.
- [ ] Controller has the guard, decodes every input with `SchemaPipe`, runs through `EffectRuntime`, holds no rule.
- [ ] Use case yields `CurrentUser` and acts on the owner's data only; applies domain command functions.
- [ ] Retry-safe create/delete; store failures are defects; map commands inside `transaction`.
- [ ] Store queries filter by owner; Drizzle only through `Database.run`/`use`.
- [ ] Migration is additive, generated last after rebase.
- [ ] No `process.env` outside the listed files; nothing secret logged.
- [ ] Integration test through the contract client, own account per test, errors asserted by `_tag`.
