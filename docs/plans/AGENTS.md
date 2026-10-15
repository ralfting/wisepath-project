# Working on a plan in parallel (brief for agents)

You are one of several agents, each building one plan from this folder in its own Orca worktree and branch, at the same time. These rules keep you from stepping on each other.

## Your setup

| Plan | Branch | Web port | API port | Databases |
| --- | --- | --- | --- | --- |
| 1 Inbox | `plan/01-inbox` | 3011 | 3111 | `wisepath_inbox`, `wisepath_inbox_test` |
| 3 Review | `plan/03-review` | 3013 | 3113 | `wisepath_review`, `wisepath_review_test` |
| 4 Search | `plan/04-search` | 3014 | 3114 | `wisepath_search`, `wisepath_search_test` |
| 7 Templates | `plan/07-templates` | 3017 | 3117 | `wisepath_templates`, `wisepath_templates_test` |

- Run `pnpm install` once in your worktree.
- Postgres is the shared Docker container on `localhost:5432` (user and password `wisepath`). Use **only your own databases**. Create yours with `docker compose exec db createdb -U wisepath <name>` if missing.
- **Never use the `DATABASE_URL` in `apps/api/.env`** (it points at the hosted database). Always pass your own on the command line:
  - API tests: `cd apps/api && TEST_DATABASE_URL=postgresql://wisepath:wisepath@localhost:5432/<your>_test pnpm test`
  - API for browser checks: build, migrate and seed your database, then start it on your port:
    `cd apps/api && pnpm build && DATABASE_URL=postgresql://wisepath:wisepath@localhost:5432/<your> pnpm db:migrate && DATABASE_URL=… pnpm db:seed`, then
    `DATABASE_URL=… JWT_SECRET=local-dev-only-change-me FRONTEND_URL=http://localhost:<web port> PORT=<api port> node dist/main.js`
  - Web: `cd apps/web && NEXT_PUBLIC_API_URL=http://localhost:<api port>/api pnpm exec next dev -p <web port>`
  - The demo account is `demo@wisepath.dev` / `wisepath-demo` once seeded.
- Leave the main checkout's servers alone (web 3002, API 3001 in Docker).

## While building

- Read the plan you were given, [README.md](README.md) (shared ground), and [05-i18n.md](05-i18n.md) (conventions and glossary). **All interface text goes through `useT()`**, in English and Brazilian Portuguese, under your plan's own message files: add `apps/web/i18n/messages/en/<area>.ts` and `pt-BR/<area>.ts` for your area and register it in both `index.ts` files (one line each).
- Stay in your plan's scope. Touching a shared file (`AppFrame.tsx`, `MarkdownEditor.tsx`, `WisePathApi.ts`, the message indexes, `schema.ts`) is fine, but keep it to the few lines your plan needs.
- Code style: match the surrounding code (single quotes in `apps/web/features`, ~140 columns). **Never run prettier.** Comments explain why, in plain sentences, like the existing ones.
- Commit as you go on your branch, one logical step per commit, messages in the repo's style (`feat(web): …`, a short body saying what and why), ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Migrations last:** change `schema.ts` as you need, but generate the migration (`pnpm db:generate --name <plan>`) only at the end, after `git rebase main`, so its number follows whatever is on `main` by then.
- If the plan leaves a decision open, take its recommendation and note it in your final report.

## Done means

- Domain rules unit tested; API tested against your test database; browser check of the feature as a learner would use it (keyboard included), with axe reporting nothing in light and dark; both languages shown.
- `cd apps/web && npx tsc --noEmit -p .`, and the same in `apps/api`, `packages/domain`, `packages/contract`, all clean; all tests pass.
- `docs/FEATURES.md` describes the feature and its shortcuts.
- Rebased on the latest `main`, migration generated last. **Do not merge into `main` and do not push**: report that the branch is ready, with what you built, the decisions you took, and how you checked it. The merges into `main` are done one at a time by the coordinating session.
- Update your Orca worktree's comment at checkpoints (`orca worktree set --worktree active --comment "…"`).
