# Architecture (apps/web)

Organised by business domain, not by technical type. Domains: `auth`, `paths` (maps and their pages), `projects`,
`inbox`, `search`, `review`. Their model lives in `packages/domain/src/<domain>`.

## Layers

Dependencies point one way: `app → features → useCases → infrastructure`, and every layer may use `@wisepath/domain`.

| Layer | Where | Owns | Never |
|---|---|---|---|
| Routes | `app/` | Read and decode `params`/`searchParams`, call `queries.ts`, render features, `notFound()`/`redirect()`, metadata | Business logic, Effect, `fetch`, infrastructure |
| Route chrome | `app/_components/` | Frame, top bar, navigation shared by layouts | Domain data fetching of its own |
| Features | `features/<domain>/<feature>/` | Components and colocated `use<Component>` hooks that render one domain's data | Effect, infrastructure, `fetch` |
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
| `shared/` | Nothing in the app; standard library only |
| `packages/domain/<a>` | `effect`; another domain only by `import type` or a schema/constant from its deep file (`../auth/User`), never its `index.ts` |

### Forbidden

| Rule | Enforced by |
|---|---|
| `app/` and `features/` import `effect`, `effect/*`, `@effect/*` (except `features/**/*.test.tsx`) | ESLint `no-restricted-imports` |
| `app/` and `features/` import `@/infrastructure/*` | ESLint |
| `useCases/` imports `@/features/*` | ESLint |
| `infrastructure/` imports React, Next, Mantine, `@/features/*`, `@/useCases/*` | ESLint |
| `features/<a>` imports a file inside `features/<b>` other than its `index.ts` | Review (`TODO(decide)`: lint) |
| `i18n/` or `shared/` imports `features/*` (today `I18nProvider` imports `features/shared/title`) | Review |
| `packages/domain` imports another domain's `index.ts` at runtime | Review |
| A client component imports `queries.ts` or `infrastructure/server/*` | `import 'server-only'` fails the build |
| A `features/shared/` or `features/common/` folder | Review |

## Ownership

- One domain owns a resource. A function or service that reads or writes one resource lives in that domain.
  Needing a second domain makes it a use case flow: `useCases/<owning-domain>/<flow>.ts` that yields both services.
  **Why:** `useCases/paths/sync.ts` already composes paths and projects; spreading that into the domain couples them.
- A feature is owned by concept, not by import count. A component that renders paths lives in `features/paths/`
  even if only the inbox uses it today.
- Generic primitives (a palette, a field wrapper, a keyboard hint) are not features: extend Mantine through
  `theme.ts` or put the component in `app/_components/` if it is route chrome. `TODO(decide): ui primitives home`
  for primitives that are neither (today `features/shared/look.tsx`, `usePaletteKeys`).
- Ambient context is a parameter. The session user, the current path and the locale are passed in as arguments
  (or a `Context.Service` provided at the edge), never imported inside the domain or a program. They are resolved
  once: on the server by the `queries.ts`/`actions.ts` edge, on the client by `useSession` and the route params.

## Target structure and migration

The rules describe the target. Code not yet moved keeps working; when you touch it, move it if the move is in scope,
otherwise leave it and follow the target for new files.

| Today | Target |
|---|---|
| `features/paths/` (home) | `features/paths/home/` |
| `features/map/`, `features/page/`, `features/editor/` | `features/paths/map/`, `features/paths/page/`, `features/paths/editor/` |
| `features/inbox/`, `features/capture/` | `features/inbox/list/`, `features/inbox/capture/` |
| `features/search/`, `features/auth/`, `features/help/` | same names, one feature folder each |
| `features/shell/AppFrame.tsx` | `app/_components/AppFrame/` |
| `features/shared/routes.ts`, `fieldError.ts`, `title.ts` | `shared/routes.ts`, `shared/forms.ts`, `shared/title.ts` |
| `features/shared/look.tsx`, `relatedHover.ts` | the `paths` feature that owns them |
| Client-only reads (`useProjects`, `usePaths`, map load) | `queries.ts` on the server runtime, dehydrated into atoms |
| Discrete mutations through atoms (`useCreateProject`, login) | `actions.ts` Server Actions |
| `inBrowser` guards in `Http*` Layers | removed once the server runtime forwards the session cookie |

## Where does this file go?

1. A URL segment, its loading/error/not-found state or metadata: `app/<segment>/`.
2. Chrome shared by several layouts (frame, nav): `app/_components/`.
3. A schema, branded id, tagged error, pure rule or service interface: `packages/domain/src/<domain>/`.
4. An Effect program over one or more domain services: `useCases/<domain>/programs.ts` (or `<flow>.ts` when it
   composes 2+ domains; the folder is the domain that owns the outcome).
5. A server read for a page: `useCases/<domain>/queries.ts`. A mutation from a form or button: `useCases/<domain>/actions.ts`.
6. A client hook that runs a program on atoms: `useCases/<domain>/<domain>.ts`, exported from its `index.ts`.
7. A Layer that talks to the API, the browser or a third party: `infrastructure/<domain>/Http<Service>.ts`, with its
   `Memory<Service>.ts` double beside it.
8. A component rendering one domain's data: `features/<domain>/<feature>/`. Its view-state hook: same folder, `use<Component>.ts`.
9. A pure helper with no domain import and no I/O used by 2+ layers: `shared/`. Used by one module: keep it there.
10. A message: `i18n/messages/en/<area>.ts` and `i18n/messages/pt-BR/<area>.ts`.
11. None fits: stop and ask.

## Naming

| Thing | Convention | Example |
|---|---|---|
| Component file | PascalCase, one exported component | `PagePicker.tsx` + `PagePicker.module.css` |
| Colocated hook | `use<Component>` | `usePagePicker.ts` |
| Local event handler | `handle<Event>` | `handleSubmit`, `handleTitleBlur` |
| Callback prop | `on<Event>` | `onSelect`, `onClose` |
| Effect program | verb + noun, span `useCases.<domain>.<verb>` | `createProject`, `Effect.fn("useCases.projects.create")` |
| Layer | `<Transport><Service>` | `HttpProjectRepository`, `MemoryAuth` |
| Feature entry | `index.ts` exporting only what other layers use | `export { PathsHome } from './PathsHome'` |

- Full words: `project`, not `proj`; `event`, not `e` outside one-line handlers; `index` is fine in loops.
- Product words from [PRODUCT.md](../../PRODUCT.md): path, map, page, root, module, Inbox. Never "node" or "note" in UI code.
