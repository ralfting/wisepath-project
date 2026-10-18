# Deploying to Vercel (Hobby)

Two Vercel projects from this one repo, plus a Neon Postgres database.

```
browser ──> web (Next.js)  ──/api/* rewrite──>  api (Nest as a Vercel Function) ──> Neon
```

The browser only ever talks to the web app's domain. Next rewrites `/api/*` to
the API project, so the session cookie the API sets belongs to the web domain,
where `middleware.ts` can read it. CORS never comes into play.

## 1. Database (Neon)

1. Create a Neon project (free plan). Copy the **pooled** connection string
   (host has `-pooler`), with `sslmode=require`.
2. Apply the migrations from your machine:

   ```sh
   pnpm --filter @wisepath/api build
   DATABASE_URL="<neon pooled url>" pnpm --filter @wisepath/api db:migrate
   ```

   After the first time, CI runs the migrations on every push that touches the API.

## 2. API project

- Import the repo in Vercel, **Root Directory** `apps/api`.
  `apps/api/vercel.json` sets the rest: no framework, `nest build`, and every
  path rewritten to `api/index.js`, which serves the Nest app (`src/vercel.ts`).
  Vercel needs a non-empty output directory, hence `public/robots.txt`.
- Environment variables:
  - `DATABASE_URL`: the Neon pooled URL
  - `JWT_SECRET`: a new long random string (`openssl rand -base64 48`), not the one in `.env`
  - `FRONTEND_URL`: the web project's URL
  - `ADMIN_EMAILS`: the emails of the accounts that approve paths for the catalog, comma separated
- Check: `https://<api-project>.vercel.app/api` answers "Hello from WisePath API!".

## 3. Web project

- Import the repo again, **Root Directory** `apps/web` (Next.js is detected).
- Environment variables:
  - `API_ORIGIN`: `https://<api-project>.vercel.app` (no trailing slash, no `/api`)
  - `NEXT_PUBLIC_API_URL`: `/api`
- `NEXT_PUBLIC_API_URL` is inlined at build time: redeploy after changing it.

## Deploying

Every push to `main` that passes CI deploys on its own: the `deploy` job in
`.github/workflows/ci.yml` migrates Neon, deploys the API, then the web app,
each only when the push touched it, and checks each one answers. It needs two
repository secrets: `VERCEL_TOKEN` (a token from vercel.com/account/tokens)
and `NEON_DATABASE_URL` (the pooled URL).

### By hand, from the CLI

Deploy from the repo root (so the workspace
packages go along; `.vercelignore` leaves build output out), naming the
project by id:

```sh
VERCEL_ORG_ID=<team id> VERCEL_PROJECT_ID=<project id> npx vercel@latest deploy --prod
```

Deploy the API before the web app when both change.

## Limits worth knowing

- Hobby is for non-commercial use only.
- The API cold-starts after a while idle (Nest boot + Neon waking up), so the
  first request can take a few seconds.
