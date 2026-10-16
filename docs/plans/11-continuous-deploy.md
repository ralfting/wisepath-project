# 11. Continuous deploy

Proposed 2026-10-16.

## Why

Deploying today is two manual `vercel deploy` runs from the repo root, plus a migration run by hand against Neon (see [DEPLOY.md](../DEPLOY.md)). It is easy to forget the migration, deploy the web app before the API, or ship a commit CI rejected.

## The outcome

Every push to `main` that passes CI reaches production on its own, in a safe order:

```
push to main ──▶ check (typecheck, lint, test) ──▶ migrate Neon ──▶ deploy API ──▶ deploy web
```

- Nothing deploys if `check` fails.
- Only what changed deploys: a push touching only `docs/` deploys nothing; one touching only `apps/web` skips the migration and the API.
- One deploy at a time: a second push waits for the first to finish rather than cancelling it halfway.

## How it works

GitHub Actions drives the Vercel CLI, the same commands that work by hand today. The Vercel GitHub app is not used: it would deploy both projects on every push, in no set order, with no migration step and no CI gate.

A `deploy` job in `.github/workflows/ci.yml`, after `check`, on pushes to `main` only:

1. **What changed:** `git diff --name-only <before>..<after>` sorts the push into `api` (`apps/api/**`, `packages/**`, `pnpm-lock.yaml`) and `web` (`apps/web/**`, `packages/**`, `pnpm-lock.yaml`).
2. **Migrate** (if `api`): `pnpm --filter @wisepath/api build`, then `node dist/migrate.js` with the Neon `DATABASE_URL`. It is idempotent: with nothing pending it only logs "Database is up to date".
3. **Deploy the API** (if `api`): `vercel deploy --prod` from the repo root with the API project's id, then a smoke test: `GET /api` answers 200.
4. **Deploy the web app** (if `web` or `api`, since the contract is shared): same command with the web project's id, then a smoke test: `GET /` answers 200 and `GET /api/projects` answers 401 through the rewrite.

`concurrency: { group: deploy-production, cancel-in-progress: false }` keeps deploys in line.

### Secrets (GitHub → repo → Settings → Secrets → Actions)

| Secret | What |
| --- | --- |
| `VERCEL_TOKEN` | A token made for this, named `github-actions`, scoped to the team |
| `NEON_DATABASE_URL` | The pooled Neon URL, for the migration step only |

The team and project ids are not secret; they go in the workflow as `env`.

### The rule this brings: migrations stay backward compatible

Between steps 2 and 3 the old API runs against the new schema for a minute or so. Migrations must only add (columns with defaults, new tables, new indexes). Removing or renaming takes two pushes: first stop using it, then drop it. This goes in the API's README next to the migrations.

## Steps

1. Create the `github-actions` Vercel token and set both secrets with `gh secret set`.
2. Add the `deploy` job to `ci.yml`.
3. Update [DEPLOY.md](../DEPLOY.md): deploys are automatic; the CLI commands stay as the manual fallback.
4. Note the backward-compatible migrations rule in `apps/api`'s README.
5. Push and watch the first run: it should migrate (nothing pending), deploy both, and pass the smoke tests.

## Checks

- A docs-only push: `check` runs, `deploy` skips every step.
- A web-only push: no migration, no API deploy, web deployed.
- A push with a failing test: no deploy.
- After a run, https://wisepath-web.vercel.app logs in and opens a project.

## Later

- Preview deploys per pull request, each with its own Neon branch, if work moves off `main`.
- Rollback: `vercel rollback` on both projects, documented once it is needed.
