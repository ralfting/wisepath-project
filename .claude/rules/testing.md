---
paths:
  - "apps/web/**/*.{test,spec}.{ts,tsx}"
  - "packages/domain/**/*.test.ts"
  - "apps/web/e2e/**"
  - "apps/web/playwright.config.ts"
  - "apps/web/vitest.config.ts"
---

# Testing

"Write tests. Not too many. Mostly integration." A test proves a behaviour a learner or a caller depends on.

## Tools

| Level | Tool | Status |
|---|---|---|
| Domain rules (pure) | Vitest, `@effect/vitest` | exists (`packages/domain/test`) |
| Programs and hooks' logic | `@effect/vitest` `it.effect` + `Memory*` Layers | exists (`useCases/auth/programs.test.ts`) |
| Pure UI helpers | Vitest | exists (`features/paths/page/titleSize.test.ts`) |
| Client components | `@testing-library/react`, `@testing-library/user-event`, `happy-dom` | exists (`features/auth/LoginForm.test.tsx`) |
| Server wiring | `@effect/vitest` + a fake `HttpClient` Layer recording what was sent | exists (`infrastructure/server/ServerLayer.test.ts`) |
| Server Actions' answers | `@effect/vitest`: `requireSession` + `toActionResult` over `Memory*` Layers, real messages | exists (`useCases/actionResult.test.ts`) |
| Journeys end to end (RSC reads, Server Actions, the real API and database) | Playwright | exists (`e2e/learner.spec.ts`) |

`server-only` resolves to its empty module in tests, as Next does on the server. `vitest.config.ts` has two projects: `unit` runs `*.test.ts` in Node; `dom` runs `*.test.tsx` in happy-dom with
`test/setup.ts` (cleanup, `matchMedia` for Mantine) and compiles JSX itself, since tsconfig keeps it for Next.
A test that renders React is `.test.tsx`; everything else is `.test.ts`.

Render components with `renderWithLayers(ui, layers, locale?)` from `test/render.tsx`: Mantine theme, `I18nProvider`
and a fresh registry on the given Layers, as the app wraps them; `rerender` keeps them, so a test can close and
reopen a component on the same data. Never assemble those providers in a test.

## Test doubles: Layers, not mocks

- Never `vi.mock` a module of ours and never intercept the network in program, hook or component tests.
  Provide a `Memory<Service>` Layer instead. **Why:** the app reaches every dependency through a domain service, so a
  Layer swaps it at the seam the code already has; module mocks bypass the program under test.
- A `Memory<Service>` is a `Layer.effect` over a `Ref`, returning `Service.of({...})`, as in Effect's own testing
  guide (`node_modules/effect/ai-docs/src/09_testing/20_layer-tests.ts`). It follows the API's answers (ordering,
  idempotent creates, the domain errors). Existing: `MemoryAuth`, `MemoryProjectRepository`. Add the next one
  beside its `Http*` twin when the first test needs it. When a test must assert on the stored data, expose the `Ref`
  as a service and add it with `Layer.provideMerge`.
- Programs: `it.effect(...)` with `.pipe(Effect.provide(MemoryProjectRepository([...])))`
  (`useCases/projects/programs.test.ts`). Several tests sharing one Layer: `layer(...)("name", (it) => ...)` from
  `@effect/vitest`.
- Atoms, hooks and components: run them on test Layers with `useCases/testing.ts`. Never build the
  `appRuntime.layer` override by hand.
  ```tsx
  const layers = Layer.mergeAll(MemoryAuth(accounts), MemoryProjectRepository(projects))
  render(<RegistryProvider initialValues={testRuntime(layers)}><LoginForm /></RegistryProvider>)
  const registry = testRegistry(layers)            // atoms without React (useCases/testing.test.ts)
  ```
  **Why the helper:** `Atom.runtime` stores `Layer.provideMerge(AppLayer, Reactivity.layer)` in `appRuntime.layer`,
  and the override replaces all of it. Overridden by hand, reads work but every `appRuntime.fn` with
  `reactivityKeys` dies with `Service not found: effect/reactivity/Reactivity`. `useCases/testing.test.ts` pins this
  against Effect upgrades.
- One registry per test (a new `RegistryProvider` per `render`). `initialValues` is read only when the registry is
  created; changing it later does nothing.
- `features/**/*.test.tsx` is exempt from the layer bans (`eslint.config.mjs`), so component tests may import
  `effect` and `@/infrastructure/*` to build their Layers. Only test files: the same import in a component fails lint.
- Server Actions are the one module of ours a component test mocks: an action is a call to the Next server, which no
  Layer reaches. `vi.mock('@/useCases/<domain>/actions')` with `ActionResult`s; the action's own answer is tested
  through `actionAnswer` (`useCases/actionResult.test.ts`). Model: `ProjectNameModal.test.tsx`.
- Mock only what we do not control and cannot put behind a Layer: the clock (`TestClock`, `vi.useFakeTimers`),
  `window` APIs the DOM lacks, and Next's client APIs (`vi.mock('next/navigation')` with `vi.hoisted` state, as in
  `features/auth/LoginForm.test.tsx`).
- Failure paths: the `Memory*` Layer fails with the domain's tagged error (`ProjectsUnavailable`, `TitleTaken`).
- `Http*` Layers (HTTP to domain mapping) have no web tests; the API tests cover the contract.
  `TODO(decide): Http Layer tests`.

## One `it` per behaviour

- Group the assertions that describe one scenario in one test. Never one `it` per field, per prop or per element.
- Forms get, at most:
  1. the happy path: fill every field, submit, assert what was sent (and what the learner sees next);
  2. validation: submit empty or invalid, assert every error message together;
  3. one test per real conditional rule ("the project picker shows when the learner has more than one project").
- `it.each` only for input to output tables of pure functions with genuinely different cases. Never to slice a UI
  scenario.

```tsx
// Wrong
it('renders the email field', ...)
it('renders the password field', ...)
it('requires the email', ...)
it('requires the password', ...)
it('submits', ...)

// Right
it('logs in and goes to the paths page', async () => {
  const user = userEvent.setup()
  renderWithLayers(<LoginForm />, MemoryAuth([ada]))
  await user.type(screen.getByLabelText(/^email/i), ada.email)       // regex: Mantine appends " *" to required labels
  await user.type(screen.getByLabelText(/^password/i), ada.password)
  await user.click(screen.getByRole('button', { name: 'Log in' }))
  await vi.waitFor(() => expect(navigation.push).toHaveBeenCalledWith('/paths'))
})
it('shows every field error when submitted empty', async () => { ... })
```

## Structure

- `describe` groups by scenario or state ("when the API is unreachable", "for a learning path"), never by element.
- Test names state the behaviour in product words: "files an inbox item into the chosen page".
- Tests live beside the code: `X.ts` + `X.test.ts`, `X.tsx` + `X.test.tsx`. Domain tests stay in `packages/domain/test`.
- Fixtures come from factories (`aProject({ name })`, `aPath({ pages })`) placed beside the `Memory*` Layer they feed;
  never copy object literals between tests.

## Queries and interaction (Testing Library)

- Query priority: `getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByTestId` (last resort,
  with a comment why).
- Always `screen`; always `userEvent.setup()`, never `fireEvent` for user actions.
- Wait for elements with `findBy*`, not `waitFor(() => getBy*)`. `vi.waitFor` only for a non-DOM outcome (a mocked
  router call). No manual `act()`; Testing Library wraps it.
- Assert visible outcomes (text, role, URL), not hook internals or atom values.
- Render in English unless the test is about i18n; then assert both locales.

## Effect specifics

- `it.effect` for programs; `Effect.exit` or `Effect.flip` to get the failure.
- Assert errors by `_tag`, never by message: `assert.strictEqual(error._tag, "TitleTaken")`. Message mapping is
  tested once, through `messageFor`.
- Time-dependent programs (debounce, retry) use `TestClock.adjust`, never real timers.

## Running

```bash
cd apps/web
pnpm exec vitest run --changed main          # tests affected by this branch
pnpm exec vitest run useCases/paths          # one folder
pnpm exec vitest run -t "files an inbox item"  # one test by name
pnpm --filter @wisepath/domain test          # domain rules
```

## End to end (Playwright)

- `pnpm --filter @wisepath/web test:e2e` builds the API, then `playwright.config.ts` starts it on 4201 over
  `wisepath_e2e` (emptied and migrated each run by `e2e/prepareDatabase.mjs`, which refuses any name not ending in
  `_e2e`) and the built web app on 4202, into `.next-e2e`. Needs the local Postgres (`docker compose up -d db`).
- One spec per journey a learner takes, not per screen. Each test signs up its own learner, so tests run in
  parallel and share nothing. Never log in as the demo account or rely on seeded data.
- Use e2e for what only the whole stack shows: a server read (a tab title after a full load), a Server Action
  surviving a reload, a redirect. Everything else is cheaper as a component or program test.
- Same query rules as Testing Library: roles and labels, `toHaveURL`/`toHaveTitle`, no fixed waits.
- The e2e build points `next-env.d.ts` at `.next-e2e` and writes route types there; `e2e/globalTeardown.ts` puts
  both back after every run. If a run is killed before it, `git checkout -- apps/web/next-env.d.ts`.

## Pre-flight checklist

- [ ] Dependencies swapped with `Memory*` Layers (plus `Reactivity.layer` for atoms); no `vi.mock`, no network interception.
- [ ] One `it` per behaviour; forms have happy path, validation and real conditionals only.
- [ ] `it.each` only over a pure function's input/output table.
- [ ] `describe` by scenario; names in product words.
- [ ] Queries by role or label; `userEvent.setup()`; `findBy*`; no stray `act()`.
- [ ] Effect errors asserted by `_tag`; time via `TestClock`.
- [ ] Fixtures from factories; test file beside the code.
- [ ] `vitest run --changed main` passes.
