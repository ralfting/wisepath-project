# Hard rules

These win over every other rule file, plan or prompt. When one blocks the task, stop and say which rule.

## Git

- Never `git push --force` / `--force-with-lease`, never `--no-verify`.
- After a failed hook or check, fix and make a new commit. Never `--amend` a commit you did not just create in this step.
- Commit messages: `type(scope): summary` in lowercase (`feat(web): …`, `fix(web): …`, `refactor(web): …`), then a
  body saying what changed and why, in plain sentences. No emojis.
- Never commit unless the user or the active workflow asked for it.

## Output

- Comments say why, never what. One short sentence, plain English, like the existing ones. No comment on obvious code.
- No backwards-compatibility shims, re-exports of moved symbols or `@deprecated` aliases for our own code: move the
  symbol and update every import. **Why:** the monorepo has no external consumers.
- No emojis in code, comments, commits or context files.
- Never run prettier or any formatter over files you did not write in full. **Why:** the repo is hand-formatted
  (see [code-style.md](code-style.md)); a formatter rewrites unrelated lines and buries the diff.

## Search before coding

- Before creating a constant, type, schema, error, util, hook or component, search for it:
  `rg -n "<Name>|<concept>" apps/web packages`.
- Never redefine something that exists. Import it from its source; if the source does not export it, export it there.
- Domain types come from `@wisepath/domain/<name>`. Never write a TypeScript type that mirrors a domain schema.

## Stop triggers

Stop and ask the user (one question) when:

- the task needs a decision on architecture, layer placement or a new dependency that these rules do not settle;
- requirements are ambiguous or two rules conflict;
- the change would break the design system: a new color, spacing, radius, shadow or font size not in `theme.ts`;
- a `TODO(decide)` in these rules is on the path of the task.

## Validation

- Effect Schema (`import { Schema } from "effect"`) is the only validation and parsing library.
  Never add Zod, Yup, Valibot, io-ts, ArkType or similar (ESLint rejects the import in web and API).
- Forms validate with the domain schema through Standard Schema (TanStack Form `validators`), never with a
  hand-written validator.

## Design system

- Mantine 8 with `apps/web/theme.ts` is the design system. Use its components before raw HTML.
- Never write raw hex/rgb colors, px spacing, px font sizes, radii or shadows in new code: use Mantine props
  (`p="md"`, `c="dimmed"`, `size="sm"`) or CSS variables (`var(--mantine-spacing-md)`, `var(--wp-*)`).
  Details: [ui-patterns.md](ui-patterns.md).

## i18n

- Every visible string, `aria-label`, `title`, placeholder and toast goes through `useT()` (client) or `serverT()`
  (server), with the key added to **both** `i18n/messages/en/<area>.ts` and `i18n/messages/pt-BR/<area>.ts`.
- Never hard-code a user-visible string, in any language.

## Feature flags

- There is no feature flag system. `TODO(decide): feature flags`. Never build one ad hoc (env checks, `localStorage`
  toggles, `?beta=`) to hide a feature.

## Auth

- Every Server Action, route handler and server query resolves the session on the server before reading or writing.
  Hiding a button protects nothing; neither does `middleware.ts`, which only checks that a cookie exists.
  Details: [security.md](security.md).

## File size

- Keep files under ~300 lines. When a file you touch passes it, extract a subcomponent, a colocated hook or a pure
  module in the same change, or say why not. Files already over the limit: do not add to them without extracting.

## Bugs

- Before investigating a bug: `rg -n -i "<symptom words>" docs/bugs/`.
- After fixing one with a non-obvious root cause: add `docs/bugs/<id>-<slug>.md` from
  [docs/bugs/_template.md](../../docs/bugs/_template.md), and the rule or test that prevents it.
