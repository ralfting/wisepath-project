# WisePath

A notebook for learning a subject: break it into pages, write each one in markdown, link them with `[[Page]]`, and watch the map grow from the start page down to "Now I know …".

Monorepo (pnpm + Turborepo):

| Path | What |
|---|---|
| `apps/web` | Next.js 15 front end (React 19, Mantine 8, Effect 4) on port 3000 |
| `apps/api` | NestJS API on port 3001 (`/api`): use cases in Effect 4, Postgres through `@effect/sql-pg` |
| `packages/domain` | `@wisepath/domain`: the model in plain TypeScript and Effect Schema (auth, projects), no React |
| `packages/contract` | `@wisepath/contract`: the API described with Effect `HttpApi`; the web's client is generated from it and the API serves it as OpenAPI |
| `prisma/` | Database schema and migrations (Postgres). Prisma is used for these and the seed only |

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

Then open <http://localhost:3000> and log in with:

| Email | Password |
|---|---|
| `demo@wisepath.dev` | `wisepath-demo` |

Maps are kept in Postgres by the API. Every account gets its own copy of the sample map once, the first time it lists its maps: a NestJS root and 41 pages up to three levels deep, 8 of them shown as modules, connected only by `[[links]]`. Deleting it doesn't bring it back. Start more maps from **New map** on <http://localhost:3000/projects>.

> Run the web app with the `--filter` above rather than `pnpm dev`: `pnpm dev` also starts the API on port 3001, which clashes with the one in Docker.

## Everyday commands

```bash
docker compose logs -f api          # API logs
docker compose up --build -d        # rebuild after changing API code or the schema
docker compose down                 # stop (database data is kept)
docker compose down -v              # stop and wipe the local database

docker compose exec api pnpm db:seed     # re-run the seed (safe to repeat)
docker compose exec api pnpm db:migrate  # apply pending migrations
```

Postgres is also published on `localhost:5432` (user, password and database: `wisepath`), so a local client or `pnpm --filter @wisepath/api db:studio` can browse it.

## Run the API without Docker

Useful for hot reload while working on the API. Keep only the database in Docker:

```bash
docker compose up -d db
cp apps/api/.env.example apps/api/.env      # points at the Postgres above
pnpm --filter @wisepath/api exec prisma generate   # for the seed script
pnpm --filter @wisepath/api db:migrate
pnpm --filter @wisepath/api db:seed
pnpm --filter @wisepath/api dev             # http://localhost:3001/api, reloads on change
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
| Contract | `packages/contract` | The HTTP API as `HttpApi` groups (auth, projects, links): paths, payloads, and each domain error with its status. |
| Infrastructure | `apps/web/infrastructure` | `Layer`s that implement the domain services over the API client generated from the contract: auth, projects, link previews. In-memory versions for tests sit beside them. |
| Use cases | `apps/web/useCases` | Effect programs plus the hooks the UI calls (`useSession`, `useLogin`, `useProject`, `useProjects`, `useLinkPreview`, …), backed by atoms. Every hook that touches a service lives here, including ones that combine domains. |
| Features | `apps/web/features` | React components by feature (`shell`, `auth`, `map`, `page`, `editor`, `projects`). They use hooks from `useCases` and pure rules from the domain, never Effect or infrastructure directly. |
| Routes | `apps/web/app` | Next.js pages and layouts: read params, render a feature. |

An open map is a sync session (`useCases/projects/sync.ts`): each change is a command from the domain (`NewPage`, `PageEdit`, …), applied on screen at once with the same function the API runs, then sent in order in the background. Typing in a page becomes one command after a 400 ms pause. Without a connection the commands wait and are retried ("Offline · retrying"); a command the API refuses is dropped, the map is read again and what was still waiting is applied on top.

Forms use TanStack Form with the domain schemas (Effect Schema through Standard Schema), so the form and the use case validate with the same rules.

The [Effect language service](https://github.com/Effect-TS/language-service) is enabled in every `tsconfig.json`; in VS Code, pick "Use Workspace Version" of TypeScript to see its diagnostics. From the terminal: `npx effect-language-service diagnostics --project tsconfig.json`.

## How the API is organised

NestJS handles HTTP: routes, the session guard, cookies. What the API does is written in Effect, on the same domain package the web uses, so both apply a change with the same function.

| Layer | Where | What lives there |
|---|---|---|
| Application | `src/<module>/application` | Use cases (`Effect.fn` programs) and the ports they need as `Context.Service`: `ProjectStore`, `UserStore`, `PasswordHasher`, `PageFetcher`. No Nest, Express or SQL. |
| Infrastructure | `src/<module>/infrastructure` | Nest controllers and guards, and the `Layer`s behind the ports: SQL stores (`@effect/sql-pg`), bcrypt, the page fetcher for link previews. |
| Shared | `src/shared` | `EffectRuntime` (one `ManagedRuntime` for the app, over one connection pool) and `SchemaPipe`. |

A request goes: controller, then `SchemaPipe` decodes the body or query with the domain schema (400 `InvalidRequest` when it doesn't match), then `EffectRuntime` runs the use case. A domain error becomes the status it declares, with its own JSON body (`{ "_tag": "TitleTaken", "title": "JWT" }`); anything else is logged and answered with a 500. ESLint (`apps/api/eslint.config.mjs`) keeps application code free of Nest, infrastructure and the Prisma client.

## Environment variables

**API** (`apps/api/.env` outside Docker; `docker-compose.yml` sets them in Docker)

| Variable | Purpose | Local value |
|---|---|---|
| `DATABASE_URL` | Postgres connection | `postgresql://wisepath:wisepath@localhost:5432/wisepath` |
| `JWT_SECRET` | Signs the session token. Required in production (32+ characters); elsewhere it falls back to a development key | any long random string |
| `FRONTEND_URL` | Origin allowed by CORS | `http://localhost:3000` |
| `HOST`, `PORT` | Where the API listens | `127.0.0.1`, `3001` (Docker uses `0.0.0.0`) |

**Web** (`apps/web/.env.local`, optional)

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL | `http://localhost:3001/api` |

Never commit real `.env` files; use the `.env.example` files as templates.

## API endpoints

The full description, generated from the contract, is at <http://localhost:3001/api/openapi.json> (OpenAPI 3). Every endpoint except signup, login and logout needs the session: the `access_token` cookie, or the same token as `Authorization: Bearer`.

| Method | Path | |
|---|---|---|
| `POST` | `/api/auth/signup` | `{ name, email, password }`, sets the cookie; 409 `EmailAlreadyRegistered` |
| `POST` | `/api/auth/login` | `{ email, password }`, sets the cookie; 401 `InvalidCredentials` |
| `POST` | `/api/auth/logout` | clears the cookie |
| `GET` | `/api/auth/me` | the session's user |
| `GET` | `/api/projects` | your maps, summarised (progress, next page) |
| `POST` | `/api/projects` | `{ id, rootPageId, title }`: a new map; ids are UUIDs chosen by the client |
| `GET` | `/api/projects/:projectId` | one map with its pages |
| `PATCH` | `/api/projects/:projectId` | `{ description }`; the title follows the root page's |
| `DELETE` | `/api/projects/:projectId` | deletes the map and its pages |
| `POST` | `/api/projects/:projectId/pages` | `{ id, title }`: a new page; 409 `TitleTaken` |
| `PATCH` | `/api/projects/:projectId/pages/:pageId` | title, content, studied, module, colour, icon; a rename passes `previousTitle` to move the `[[links]]` |
| `DELETE` | `/api/projects/:projectId/pages/:pageId` | pages only it reached become orphans; the root can't be deleted (422) |
| `GET` | `/api/link-preview?url=` | title, description, site and icon of a public http(s) page; 422 `LinkNotPreviewable` |

Sending the same create or delete twice changes nothing more, so clients can retry safely. Someone else's map answers 404, as if it didn't exist.

## Troubleshooting

- **Port 5432 or 3001 already in use**: stop the other Postgres or API, or change the left side of `ports` in `docker-compose.yml`.
- **Login from the web app fails with a network error**: the API isn't running. Check `docker compose ps`.
- **Prisma says the client isn't generated** when seeding outside Docker: run `pnpm --filter @wisepath/api exec prisma generate`. The API itself doesn't use the Prisma client.
- **`prisma generate` tries to run `pnpm add prisma`**: your `node_modules` predate the repo's `.npmrc`. Reinstall with `pnpm install --config.confirmModulesPurge=false`.
- **Start over with an empty database**: `docker compose down -v && docker compose up --build -d`, then seed again.
