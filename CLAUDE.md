# WisePath

A notebook for learning a subject: pages in markdown, linked with `[[Title]]`, read as a map from the root page.
Product intent and users: [PRODUCT.md](PRODUCT.md). Setup, API endpoints and env vars: [README.md](README.md).

Scope: `apps/web` (Next.js) and `apps/api` (NestJS), on the shared `packages/domain` and `packages/contract`.

## How the context is loaded

Rules live in `.claude/rules/`. Files without `paths:` load in every session; the others load only when a file
matching their `paths:` is read or edited. Each rule has one owner file; the others link to it.

| File | Loads | Owns |
|---|---|---|
| [always.md](.claude/rules/always.md) | always | Hard bans. Wins every conflict |
| [overview.md](.claude/rules/overview.md) | always | Stack, folder map, commands |
| [architecture.md](.claude/rules/architecture.md) | always | Layers, import rules, where a file goes, naming |
| [code-style.md](.claude/rules/code-style.md) | `apps/web/**/*.{ts,tsx}` | TypeScript, formatting, KISS |
| [effect.md](.claude/rules/effect.md) | use cases, infrastructure, domain, actions, route handlers | Schema, tagged errors, services, runtimes |
| [react-next.md](.claude/rules/react-next.md) | `apps/web/app/**`, `*.tsx` | Server/client boundary, data fetching, actions, hooks |
| [ui-patterns.md](.claude/rules/ui-patterns.md) | `apps/web/features/**`, `app/**/*.tsx`, CSS | Mantine, tokens, CSS Modules, i18n in UI, a11y |
| [testing.md](.claude/rules/testing.md) | `*.test.{ts,tsx}`, `e2e/**` | Test granularity, Layers as test doubles, end to end |
| [security.md](.claude/rules/security.md) | middleware, actions, route handlers, auth, infrastructure | Session, input decoding, secrets |
| [nest.md](.claude/rules/nest.md) | `apps/api/**` | Nest layers, request flow, contract first, stores, migrations, API tests |

Agents: [.claude/agents/code-reviewer.md](.claude/agents/code-reviewer.md) (review only, never edits).

## Architecture in one paragraph

Effect end to end (level c). `packages/domain` holds schemas, branded ids, tagged errors and service interfaces;
`packages/contract` describes the NestJS API as Effect `HttpApi`. In `apps/web`: Server Components read through
`useCases/<domain>/queries.ts` on a server `ManagedRuntime`; discrete mutations are Server Actions in
`useCases/<domain>/actions.ts`; only the map editor's sync session (`useCases/paths/sync.ts`) stays client-side on
atoms talking straight to the API. Much of today's code is still client-only; the target and the migration status
are in [architecture.md](.claude/rules/architecture.md).

## Other docs

| Doc | Use |
|---|---|
| [docs/bugs/](docs/bugs/README.md) | Known bugs and their root causes. Search before investigating, add after fixing |
| [docs/FEATURES.md](docs/FEATURES.md) | What each feature does and its shortcuts. Update when a feature changes |
| [docs/plans/](docs/plans/README.md) | Feature plans; [AGENTS.md](docs/plans/AGENTS.md) for parallel agents in Orca worktrees |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Vercel and Neon deploy |

Talk to the user in pt-BR. Write code, comments, commits and these context files in English.
