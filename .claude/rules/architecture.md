# Architecture (apps/web)

Organised by business domain, not by technical type. Domains: `auth`, `paths` (maps and their pages), `projects`,
`inbox`, `search`, `review`. Their model lives in `packages/domain/src/<domain>`.

## Layers

Dependencies point one way: `app → features → useCases → infrastructure`, and every layer may use `@wisepath/domain`.

| Layer | Where | Owns | Never |
|---|---|---|---|
| Routes | `app/` | Read and decode `params`/`searchParams`, call `queries.ts`, render features, `notFound()`/`redirect()`, metadata | Business logic, Effect, `fetch`, infrastructure |
| Features | `features/<domain>/<feature>/` (`paths`, `inbox`); `features/<feature>/` for the rest (`auth`, `search`, `help`) | Components and colocated `use<Component>` hooks that render one domain's data | Effect, infrastructure, `fetch` |
| UI primitives | `ui/` | Components and hooks with no domain: `Palette`, `usePaletteKeys`, `useIsMac` | Domain, use cases, features, Effect |
| App frame | `features/shell/` | The frame, top bar and navigation that feature screens render themselves in | Domain data of its own |
| Use cases | `useCases/<domain>/` | Effect `programs.ts`; client hooks on atoms; `queries.ts` (server reads); `actions.ts` (Server Actions); flows over 2+ domains | React components, JSX |
| Infrastructure | `infrastructure/` | `Layer`s implementing domain services over `ApiClient`; `Memory*` doubles; client `AppLayer`; server runtime | React, Next, Mantine, use cases, features |
| Domain | `packages/domain` | Schemas, branded ids, tagged errors, pure rules, service interfaces, commands | React, I/O, `apps/*` |
| Contract | `packages/contract` | `HttpApi` groups for the NestJS API | Implementation |
| Shared | `shared/` | Pure helpers: routes/hrefs, form field errors, string helpers | I/O, domain imports, React state |

## Import rules

| From | May import |
|---|---|
| `app/` | `features/*` (by index), `useCases/*` (hooks, `queries`, `actions`, types), `i18n/`, `shared/`, `@wisepath/domain` types and pure rules, Mantine, Next |
| `features/` | `useCases/*` (hooks, `actions`, types), own feature internals, other features by their `index.ts` only, `i18n/`, `shared/`, `@wisepath/domain` types and pure rules, Mantine |
| `useCases/` | `infrastructure/*`, `@wisepath/domain`, `effect`, `@effect/atom-react`, `i18n/` (message lookup), `shared/`, React (hooks only), Next server APIs in `queries`/`actions` |
| `infrastructure/` | `@wisepath/domain`, `@wisepath/contract`, `effect` |
| `ui/` | React, Mantine, `i18n/`, `shared/` |
| `shared/` | Nothing in the app; standard library only |
| `packages/domain/<a>` | `effect`; another domain only by `import type` or a schema/constant from its deep file (`../auth/User`), never its `index.ts` |

### Forbidden

| Rule | Enforced by |
|---|---|
| `app/` and `features/` import `effect`, `effect/*`, `@effect/*` (except `features/**/*.test.tsx`) | ESLint `no-restricted-imports` |
| `app/` and `features/` import `@/infrastructure/*` (except `features/**/*.test.tsx`) | ESLint |
| `useCases/` imports `@/features/*` | ESLint |
| `infrastructure/` imports React, Next, Mantine, `@/features/*`, `@/useCases/*` | ESLint |
| `app/` or a feature imports another feature's internals (anything but its `index.ts`) | ESLint (`featureInternals`) |
| `i18n/` or `shared/` imports `features/*` | Review |
| `packages/domain` imports another domain's `index.ts` at runtime | Review |
| A client component imports `queries.ts` or `infrastructure/server/*` | `import 'server-only'` fails the build |
| A `features/shared/` or `features/common/` folder | Review |
| Zod, Yup, Valibot, io-ts, ArkType, Joi, Superstruct anywhere | ESLint, web and API |
| `process.env` outside `infrastructure/http/ApiClient.ts`, `infrastructure/server/ServerApiClient.ts`, `next.config.js`, `playwright.config.ts` and `e2e/**` (`NODE_ENV` allowed) | ESLint |
| `run*` (`Effect.run*`, `runtime.run*`) inside `infrastructure/`, except `infrastructure/server/ServerLayer.ts` | ESLint |
| `dangerouslySetInnerHTML` | ESLint `react/no-danger` |
| `ui/` imports `@wisepath/*`, `@/useCases/*`, `@/features/*`, `@/infrastructure/*` or Effect | ESLint |

## Ownership

- One domain owns a resource. A function or service that reads or writes one resource lives in that domain.
  Needing a second domain makes it a use case flow: `useCases/<owning-domain>/<flow>.ts` that yields both services.
  **Why:** `useCases/paths/sync.ts` already composes paths and projects; spreading that into the domain couples them.
- A feature is owned by concept, not by import count. A component that renders paths lives in `features/paths/`
  even if only the inbox uses it today.
- A feature's `index.ts` exports exactly what other features and `app/` use; inside a feature, imports are relative.
- Generic primitives (a palette, a field wrapper, a keyboard hint) are not features: extend Mantine through
  `theme.ts` first, else put them in `ui/`, taking plain props. A piece that knows a domain type (the page glyph
  takes a `PageIcon`) stays in the feature that owns that domain.
- `features/shell` is the one feature that is not a domain: feature screens render themselves inside `AppFrame`, so
  it can't live in `app/` (features would import from `app/`).
- Ambient context is a parameter. The session user, the current path and the locale are passed in as arguments
  (or a `Context.Service` provided at the edge), never imported inside the domain or a program. They are resolved
  once: on the server by the `queries.ts`/`actions.ts` edge, on the client by `useSession` and the route params.

## Feature map

| Folder | What |
|---|---|
| `features/paths/home` | The paths page: cards, projects, new path |
| `features/paths/map` | One map: mind map, list, orphans, search results, branch prompt |
| `features/paths/page` | A page: the drawer over the map and the full page |
| `features/paths/editor` | The markdown editor, its extensions and video notes |
| `features/paths/path` | Pieces about one path used across the above: gate, save status, kind switch, page glyph, the related-page hover between drawer and map |
| `features/inbox/list` | The Inbox page and its page picker |
| `features/inbox/capture` | Quick capture, toasts, and the palette keys other palettes share |
| `features/auth`, `features/search`, `features/help`, `features/shell` | Login/signup, search palette, help panel, app frame |

## Migration still open

The rules describe the target. Code not yet moved keeps working; when you touch it, move it if the move is in scope,
otherwise leave it and follow the target for new files.

| Today | Target |
|---|---|
| Client-only reads (`useProjects`, `usePaths`, map load) | `queries.ts` on the server runtime, data passed as props (first: the map's tab title) |
| Discrete mutations through atoms (paths, inbox) | `actions.ts` Server Actions, as projects already are; the session (login, signup, logout) stays on atoms |
| `inBrowser` guards in `Http*` Layers | stay for the browser's Layer (client components also render on the server, without the session); the server gets a twin without the guard (`ServerPathRepository`) |

## Where does this file go?

1. A URL segment, its loading/error/not-found state or metadata: `app/<segment>/`.
2. The app frame, top bar or navigation: `features/shell/`.
3. A schema, branded id, tagged error, pure rule or service interface: `packages/domain/src/<domain>/`.
4. An Effect program over one or more domain services: `useCases/<domain>/programs.ts` (or `<flow>.ts` when it
   composes 2+ domains; the folder is the domain that owns the outcome).
5. A server read for a page: `useCases/<domain>/queries.ts`. A mutation from a form or button: `useCases/<domain>/actions.ts`.
6. A client hook that runs a program on atoms: `useCases/<domain>/<domain>.ts`, exported from its `index.ts`.
7. A Layer that talks to the API, the browser or a third party: `infrastructure/<domain>/Http<Service>.ts`, with its
   `Memory<Service>.ts` double beside it.
8. A component rendering one domain's data: `features/<domain>/<feature>/`, one component per file. With more than one
   file (CSS module, view model, test, private parts), in a folder named after it ([ui-patterns.md](ui-patterns.md), "Components").
9. A component or hook with no domain in it, used by 2+ features: `ui/`.
10. A pure helper with no domain import and no I/O used by 2+ layers: `shared/`. Used by one module: keep it there.
11. A message: `i18n/messages/en/<area>.ts` and `i18n/messages/pt-BR/<area>.ts`.
12. None fits: stop and ask.

## Naming

| Thing | Convention | Example |
|---|---|---|
| Component file | PascalCase, one exported component | `PagePicker.tsx` + `PagePicker.module.css` |
| View model | `use<Component>`, beside the component | `MindMap/useMindMap.ts` |
| Component folder | the component's name, no `index.ts` | `MindMap/MindMap.tsx`, imported as `./MindMap/MindMap` |
| What a component and its parts share | `<Component>.helpers.ts` in its folder | `PageDrawer/PageDrawer.helpers.ts` |
| Local event handler | `handle<Event>` | `handleSubmit`, `handleTitleBlur` |
| Callback prop | `on<Event>` | `onSelect`, `onClose` |
| Effect program | verb + noun, span `useCases.<domain>.<verb>` | `createProject`, `Effect.fn("useCases.projects.create")` |
| Layer | `<Transport><Service>` | `HttpProjectRepository`, `MemoryAuth` |
| Feature entry | `index.ts` exporting only what other layers use | `export { PathsHome } from './PathsHome'` |

- Full words: `project`, not `proj`; `event`, not `e` outside one-line handlers; `index` is fine in loops.
- Product words from [PRODUCT.md](../../PRODUCT.md): path, map, page, root, module, Inbox. Never "node" or "note" in UI code.
