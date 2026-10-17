# WisePath

A notebook for learning a subject: break it into pages, write each one in markdown, link them with `[[Page]]`, and watch the map grow from the start page down to "Now I know …".

Monorepo (pnpm + Turborepo):

| Path | What |
|---|---|
| `apps/web` | Next.js 15 front end (React 19, Mantine 8, Effect 4) on port 4002 |
| `apps/api` | NestJS API on port 4001 (`/api`): use cases in Effect 4, Postgres through Drizzle on `@effect/sql-pg` |
| `packages/domain` | `@wisepath/domain`: the model in plain TypeScript and Effect Schema (auth, projects, paths), no React |
| `packages/contract` | `@wisepath/contract`: the API described with Effect `HttpApi`; the web's client is generated from it and the API serves it as OpenAPI |

## What you need

- **Node.js 20+** and **pnpm 9** (`corepack enable` gives you the right pnpm)
- **Docker** with Compose, for Postgres and the API. On macOS, [OrbStack](https://orbstack.dev) or Docker Desktop.

## Run it

```bash
# 1. Install dependencies
corepack enable
pnpm install

# 2. Start Postgres and the API (applies migrations on start)
docker compose up --build -d

# 3. Add the first data: a demo account
docker compose exec api pnpm db:seed

# 4. Start the web app
pnpm --filter @wisepath/web dev
```

Then open <http://localhost:4002> and log in with:

| Email | Password |
|---|---|
| `demo@wisepath.dev` | `wisepath-demo` |

Maps are kept in Postgres by the API. A new account starts with no paths. Every account gets a default project (General, or Geral in Portuguese) that its paths go into; more projects group the rest. Start more paths from **New path** on <http://localhost:4002/paths>.

> Run the web app with the `--filter` above rather than `pnpm dev`: `pnpm dev` also starts the API on port 4001, which clashes with the one in Docker.

## Everyday commands

```bash
docker compose logs -f api          # API logs
docker compose up --build -d        # rebuild after changing API code or the schema
docker compose down                 # stop (database data is kept)
docker compose down -v              # stop and wipe the local database

docker compose exec api pnpm db:seed     # re-run the seed (safe to repeat)
docker compose exec api pnpm db:migrate  # apply pending migrations
```

Postgres is also published on `localhost:5432` (user, password and database: `wisepath`), so any Postgres client can browse it.

## Run the API without Docker

Useful for hot reload while working on the API. Keep only the database in Docker:

```bash
docker compose up -d db
cp apps/api/.env.example apps/api/.env      # points at the Postgres above
pnpm --filter @wisepath/api build           # db:migrate and db:seed run the built scripts
pnpm --filter @wisepath/api db:migrate
pnpm --filter @wisepath/api db:seed
pnpm --filter @wisepath/api dev             # http://localhost:4001/api, reloads on change
```

## Checks

```bash
pnpm typecheck    # every package
pnpm test         # domain rules, web use cases and API integration tests (Vitest + @effect/vitest)
pnpm lint         # ESLint for the web and the API, including the layer boundaries below
```

The API tests boot the real Nest app against a database of their own, `wisepath_test` on the Postgres from `docker compose up -d db`, which is wiped and migrated before every run. Point them elsewhere with `TEST_DATABASE_URL` (its name must end in `_test`). They call the API through the client generated from the contract, so a server that drifts from the contract fails them.

## How the web app is organised

The front end is built on [Effect 4](https://effect.website) and split in layers. Each one only imports from the layers below it; ESLint (`apps/web/eslint.config.mjs`) enforces it.

| Layer | Where | What lives there |
|---|---|---|
| Domain | `packages/domain` | Schemas, branded ids, tagged errors, pure rules, and service interfaces (`Context.Service`). Plain TypeScript, no React. |
| Contract | `packages/contract` | The HTTP API as `HttpApi` groups (auth, projects, paths, links): paths, payloads, and each domain error with its status. |
| Infrastructure | `apps/web/infrastructure` | `Layer`s that implement the domain services over the API client generated from the contract: auth, projects, paths, link previews. In-memory versions for tests sit beside them. |
| Use cases | `apps/web/useCases` | Effect programs plus the hooks the UI calls (`useSession`, `useLogin`, `useProjects`, `usePath`, `usePaths`, `useLinkPreview`, …), backed by atoms. Every hook that touches a service lives here, including ones that combine domains. |
| Features | `apps/web/features` | React components grouped by the domain that owns them (`paths/{home,map,page,editor,path}`, `inbox/{list,capture}`, `auth`, `search`, `help`, `shell`). They use hooks from `useCases` and pure rules from the domain, never Effect or infrastructure directly, and reach each other only through their `index.ts`. |
| Routes | `apps/web/app` | Next.js pages and layouts: read params, render a feature. |

An open map is a sync session (`useCases/paths/sync.ts`): each change is a command from the domain (`NewPage`, `PageEdit`, …), applied on screen at once with the same function the API runs, then sent in order in the background. Typing in a page becomes one command after a 400 ms pause. Without a connection the commands wait and are retried ("Offline · retrying"); a command the API refuses is dropped, the map is read again and what was still waiting is applied on top.

Forms use TanStack Form with the domain schemas (Effect Schema through Standard Schema), so the form and the use case validate with the same rules.

The [Effect language service](https://github.com/Effect-TS/language-service) is enabled in every `tsconfig.json`; in VS Code, pick "Use Workspace Version" of TypeScript to see its diagnostics. From the terminal: `npx effect-language-service diagnostics --project tsconfig.json`.

## How the API is organised

NestJS handles HTTP: routes, the session guard, cookies. What the API does is written in Effect, on the same domain package the web uses, so both apply a change with the same function.

| Layer | Where | What lives there |
|---|---|---|
| Application | `src/<module>/application` | Use cases (`Effect.fn` programs) and the ports they need as `Context.Service`: `ProjectStore`, `PathStore`, `UserStore`, `PasswordHasher`, `PageFetcher`. No Nest, Express or SQL. |
| Infrastructure | `src/<module>/infrastructure` | Nest controllers and guards, and the `Layer`s behind the ports: Drizzle stores, bcrypt, the page fetcher for link previews. |
| Shared | `src/shared` | `EffectRuntime` (one `ManagedRuntime` for the app, over one connection pool), `SchemaPipe`, and the database: the Drizzle schema, the bridge that runs Drizzle on `@effect/sql`, and the migration runner. |

A request goes: controller, then `SchemaPipe` decodes the body or query with the domain schema (400 `InvalidRequest` when it doesn't match), then `EffectRuntime` runs the use case. A domain error becomes the status it declares, with its own JSON body (`{ "_tag": "TitleTaken", "title": "JWT" }`); anything else is logged and answered with a 500. ESLint (`apps/api/eslint.config.mjs`) keeps application code free of Nest, the database and infrastructure.

## The database

The tables are declared with Drizzle in `apps/api/src/shared/infrastructure/database/schema.ts`; queries are written with Drizzle and checked against it by the compiler, relational queries included.

Drizzle's own Effect integration needs Effect 3, so `Database.ts` runs Drizzle on the `@effect/sql-pg` client instead: Drizzle builds each query and maps its rows, `@effect/sql` runs it on the fiber that asked. Inside `Database.transaction` every query uses that transaction's connection, so the domain rules run inside it as Effect code.

To change the schema, edit `schema.ts`, then:

```bash
pnpm --filter @wisepath/api db:generate   # writes the SQL migration to apps/api/drizzle/
docker compose up --build -d api          # the container applies it on start (dist/migrate.js)
```

Migrations only add: new tables, new columns with a default, new indexes. In production each push migrates Neon a minute before the new API replaces the old one, which must keep working against the new schema. To remove or rename something, first push code that no longer uses it, then a migration that drops it.

## Environment variables

**API** (`apps/api/.env` outside Docker; `docker-compose.yml` sets them in Docker)

| Variable | Purpose | Local value |
|---|---|---|
| `DATABASE_URL` | Postgres connection | `postgresql://wisepath:wisepath@localhost:5432/wisepath` |
| `JWT_SECRET` | Signs the session token. Required in production (32+ characters); elsewhere it falls back to a development key | any long random string |
| `FRONTEND_URL` | Origin allowed by CORS | `http://localhost:4002` |
| `HOST`, `PORT` | Where the API listens | `127.0.0.1`, `4001` (Docker uses `0.0.0.0`) |

**Web** (`apps/web/.env.local`, optional)

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL | `http://localhost:4001/api` |

Never commit real `.env` files; use the `.env.example` files as templates.

## API endpoints

The full description, generated from the contract, is at <http://localhost:4001/api/openapi.json> (OpenAPI 3). Every endpoint except signup, login, logout and the public read needs the session: the `access_token` cookie, or the same token as `Authorization: Bearer`. A map answers with the reader's `access` (`owner`, `editor`, `viewer`); without the access an endpoint needs, it answers 404 `PathNotFound`, as if the map did not exist.

| Method | Path | |
|---|---|---|
| `POST` | `/api/auth/signup` | `{ name, email, password }`, sets the cookie; 409 `EmailAlreadyRegistered` |
| `POST` | `/api/auth/login` | `{ email, password }`, sets the cookie; 401 `InvalidCredentials` |
| `POST` | `/api/auth/logout` | clears the cookie |
| `GET` | `/api/auth/me` | the session's user |
| `GET` | `/api/projects` | your projects, the default first (made the first time), then by name |
| `POST` | `/api/projects` | `{ id, name }`: a new project; ids are UUIDs chosen by the client |
| `PATCH` | `/api/projects/:projectId` | `{ name }` |
| `DELETE` | `/api/projects/:projectId` | its paths move to the default project, which can't be deleted (422 `DefaultProjectProtected`) |
| `GET` | `/api/paths` | your maps and those from others (shared with you or taken), summarised (project or owner, access, progress, next page); progress is yours |
| `POST` | `/api/paths` | `{ id, projectId, rootPageId, title }`: a new map in one of your projects (404 `ProjectNotFound` otherwise) |
| `GET` | `/api/paths/:pathId` | one map with its pages |
| `PATCH` | `/api/paths/:pathId` | `{ description, kind, projectId }`; `projectId` moves it; the title follows the root page's |
| `DELETE` | `/api/paths/:pathId` | deletes the map and its pages |
| `POST` | `/api/paths/:pathId/pages` | `{ id, title }`: a new page; 409 `TitleTaken` |
| `PATCH` | `/api/paths/:pathId/pages/:pageId` | title, content, studied, module, colour, icon; a rename passes `previousTitle` to move the `[[links]]`. `studied` alone is the reader's own mark and needs only reading; the rest needs an editor; renaming the root needs the owner |
| `DELETE` | `/api/paths/:pathId/pages/:pageId` | pages only it reached become orphans; the root can't be deleted (422) |
| `GET` | `/api/paths/:pathId/shares` | the people the owner invited (owner only) |
| `PUT` | `/api/paths/:pathId/shares` | `{ email, role }` with `role` `viewer` or `editor`: invites an account or changes its role; 404 `ShareTargetNotFound`, 422 `CannotShareWithSelf` |
| `DELETE` | `/api/paths/:pathId/shares/:userId` | the owner removes someone (their marks on it go too) |
| `DELETE` | `/api/paths/:pathId/membership` | leave a map from others (your marks on it go too) |
| `PATCH` | `/api/paths/:pathId/visibility` | `{ visibility }`, `private` or `public`; private removes those who took it |
| `POST` | `/api/paths/:pathId/take` | add a public map to your maps, to study with your own marks; never a copy |
| `GET` | `/api/public/paths/:pathId` | a public map without a session, with no one's marks; 404 for a private one |
| `GET` | `/api/link-preview?url=` | title, description, site and icon of a public http(s) page; 422 `LinkNotPreviewable` |

Sending the same create or delete twice changes nothing more, so clients can retry safely. Someone else's map answers 404, as if it didn't exist.

## Troubleshooting

- **Port 5432 or 4001 already in use**: stop the other Postgres or API, or change the left side of `ports` in `docker-compose.yml`.
- **Login from the web app fails with a network error**: the API isn't running. Check `docker compose ps`.
- **Start over with an empty database**: `docker compose down -v && docker compose up --build -d`, then seed again.
