# WisePath

A notebook for learning a subject: break it into pages, write each one in markdown, link them with `[[Page]]`, and watch the map grow from the start page down to "Now I know …".

Monorepo (pnpm + Turborepo):

| Path | What |
|---|---|
| `apps/web` | Next.js 14 front end (Tailwind) on port 3000 |
| `apps/api` | NestJS API with Prisma on port 3001 (`/api`) |
| `packages/types` | Shared TypeScript types |
| `prisma/` | Database schema and migrations (Postgres) |

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

The sample project map is at <http://localhost:3000/projects/learn-javascript>. Projects and pages are not in the database yet: they live in your browser's local storage, seeded with a 25-page "Learn JavaScript" sample (the map's **Reset** link restores it).

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
pnpm --filter @wisepath/api exec prisma generate
pnpm --filter @wisepath/api db:migrate
pnpm --filter @wisepath/api db:seed
pnpm --filter @wisepath/api dev             # http://localhost:3001/api, reloads on change
```

## Environment variables

**API** (`apps/api/.env` outside Docker; `docker-compose.yml` sets them in Docker)

| Variable | Purpose | Local value |
|---|---|---|
| `DATABASE_URL` | Postgres connection | `postgresql://wisepath:wisepath@localhost:5432/wisepath` |
| `JWT_SECRET` | Signs the login cookie | any long random string |
| `FRONTEND_URL` | Origin allowed by CORS | `http://localhost:3000` |
| `HOST`, `PORT` | Where the API listens | `127.0.0.1`, `3001` (Docker uses `0.0.0.0`) |

**Web** (`apps/web/.env.local`, optional)

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL | `http://localhost:3001/api` |

Never commit real `.env` files; use the `.env.example` files as templates.

## API endpoints

| Method | Path | |
|---|---|---|
| `POST` | `/api/auth/signup` | `{ email, password, name? }`, sets the `access_token` cookie |
| `POST` | `/api/auth/login` | `{ email, password }`, sets the cookie |
| `POST` | `/api/auth/logout` | clears the cookie |
| `GET` | `/api/auth/me` | current user (needs the cookie) |

## Troubleshooting

- **Port 5432 or 3001 already in use**: stop the other Postgres or API, or change the left side of `ports` in `docker-compose.yml`.
- **Login from the web app fails with a network error**: the API isn't running. Check `docker compose ps`.
- **Prisma says the client isn't generated** (outside Docker): run `pnpm --filter @wisepath/api exec prisma generate`.
- **`prisma generate` tries to run `pnpm add prisma`**: your `node_modules` predate the repo's `.npmrc`. Reinstall with `pnpm install --config.confirmModulesPurge=false`.
- **Start over with an empty database**: `docker compose down -v && docker compose up --build -d`, then seed again.
