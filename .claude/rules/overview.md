# Overview (apps/web)

## Stack

| Concern | Choice | Version |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | pnpm 9.15, turbo 1 |
| Framework | Next.js App Router (no Pages Router, no `src/`) | 15.5 |
| UI runtime | React | 19 |
| Language | TypeScript `strict` | 5.9 |
| Effect | `effect` (Schema, Context, Layer, HttpApiClient, reactivity), `@effect/atom-react`, `@effect/vitest`, `@effect/language-service` | 4.0.3 |
| Design system | Mantine (`core`, `hooks`, `notifications`, `tiptap`) + `apps/web/theme.ts`, CSS Modules, `postcss-preset-mantine` | 8.3 |
| Icons | `@tabler/icons-react` | 3 |
| Forms | `@tanstack/react-form` with domain schemas through Standard Schema | 1 |
| Editor | Tiptap 2 + `tiptap-markdown`, `lowlight` | 2 |
| Data | NestJS API (`apps/api`) through the client generated from `@wisepath/contract`. No database access from web | - |
| Auth | httpOnly `access_token` cookie set by the API | - |
| i18n | In-house: `useT()`, `serverT()`, locales `en` and `pt-BR` | - |
| Tests | Vitest + `@effect/vitest`; Testing Library + user-event on happy-dom for components; Playwright end to end | 5 |
| Lint | ESLint 9 flat config, `next/core-web-vitals`, `next/typescript`, layer bans | - |

## Packages the web app depends on

| Package | What | Import from |
|---|---|---|
| `@wisepath/domain` | Schemas, branded ids, `Schema.TaggedError`s, pure rules, service interfaces (`Context.Service`). No React, no I/O | `@wisepath/domain/<auth\|paths\|projects\|review\|search\|inbox>` |
| `@wisepath/contract` | The API as `HttpApi` groups, each error with its status | `@wisepath/contract` (infrastructure only) |

## Folder map (apps/web)

| Path | What | Status |
|---|---|---|
| `app/` | Routes: `page`, `layout`, `loading`, `error`, `not-found`, `route`, parallel `@drawer` + intercepting `(.)pages` | exists |
| `features/<domain>/<feature>/` | Components that render one domain's data (map: [architecture.md](architecture.md), "Feature map") | exists |
| `useCases/<domain>/` | `programs.ts` (Effect), client hooks, `queries.ts` (server), `actions.ts` (Server Actions) | hooks, programs, `paths/queries.ts`, `projects/actions.ts` exist |
| `useCases/server.ts` | `runServer` (server reads) and `runAction` (Server Actions), with the request's cookies | exists |
| `useCases/actionResult.ts` | `ActionResult` and `toActionResult`, shared by actions and the hooks that call them | exists |
| `useCases/runtime.ts` | Client atom runtime `appRuntime = Atom.runtime(AppLayer)`, `ReactivityKeys` | exists |
| `infrastructure/` | `Layer`s implementing domain services over `ApiClient`; `Memory*` doubles beside them | exists |
| `infrastructure/server/` | `import 'server-only'` `ServerLayer(cookie)`, `ServerServices`, shared `ManagedRuntime` | exists |
| `i18n/` | Provider, `serverT`, formatting, `messages/<locale>/<area>.ts` | exists |
| `ui/` | UI primitives with no domain: `Palette/`, `platform.ts` (`useIsMac`) | exists |
| `shared/` | Pure helpers with no I/O and no domain import (`routes.ts`, `forms.ts`) | exists |
| `test/` | Vitest setup and `renderWithLayers` for component tests | exists |
| `theme.ts` | Mantine theme and `--wp-*` CSS variables | exists |
| `middleware.ts` | Cheap redirects on cookie presence and legacy URLs | exists |

## Commands

Run from the repo root unless noted. `pnpm dev` also starts the API on 4001, which clashes with Docker: use the filter.

| Task | Command |
|---|---|
| Start API + Postgres | `docker compose up --build -d` then `docker compose exec api pnpm db:seed` |
| Web dev server (port 4002) | `pnpm --filter @wisepath/web dev` |
| Typecheck web | `pnpm --filter @wisepath/web typecheck` |
| Lint web (includes layer bans) | `pnpm --filter @wisepath/web lint` |
| All web tests | `pnpm --filter @wisepath/web test` |
| One test file | `cd apps/web && pnpm exec vitest run useCases/auth/programs.test.ts` |
| Tests affected by the branch | `cd apps/web && pnpm exec vitest run --changed main` |
| End to end (needs `docker compose up -d db`) | `pnpm --filter @wisepath/web test:e2e` |
| Domain tests | `pnpm --filter @wisepath/domain test` |
| Effect diagnostics | `cd apps/web && npx effect-language-service diagnostics --project tsconfig.json` |
| Everything | `pnpm typecheck && pnpm lint && pnpm test` |

Demo login once seeded: `demo@wisepath.dev` / `wisepath-demo`.

## Where to read more

- Layers and imports: [architecture.md](architecture.md).
- Product vocabulary (path, map, page, root, module, Study, Learning path, Inbox): [PRODUCT.md](../../PRODUCT.md).
- Glossary for both languages: [docs/plans/05-i18n.md](../../docs/plans/05-i18n.md).
