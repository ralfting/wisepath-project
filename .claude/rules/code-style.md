---
paths:
  - "apps/web/**/*.{ts,tsx}"
  - "packages/domain/**/*.ts"
  - "packages/contract/**/*.ts"
---

# Code style

## Formatting

Hand-formatted; never run prettier ([always.md](always.md)). Match the file you are in.

| Where | Quotes | Semicolons | Width |
|---|---|---|---|
| `app/`, `features/`, `i18n/`, `shared/`, `theme.ts`, `middleware.ts` | single | yes | ~140 |
| `useCases/`, `infrastructure/`, `packages/*` (Effect code) | double | no | ~140 |

**Why:** the Effect layers follow the Effect codebase's style; the React layers follow Next's. Mixing within a file
is the only error.

## TypeScript

- `strict` stays on. Never `any`, never `@ts-ignore`/`@ts-expect-error` without a one-line why.
- Input of unknown shape is `unknown`, then decoded with a Schema ([effect.md](effect.md)).
- `import type` for type-only imports, on its own line, as the codebase does:
  ```ts
  import { ProjectId } from '@wisepath/domain/projects'
  import type { Project } from '@wisepath/domain/projects'
  ```
- Model states as discriminated unions, never as booleans that can contradict each other.
  ```ts
  // Wrong
  type Session = { loading: boolean; user?: User; error?: string }
  // Right
  type Session = { status: 'loading' } | { status: 'signedIn'; user: User } | { status: 'signedOut' }
  ```
- `readonly` on public fields and `ReadonlyArray<T>` on inputs and outputs of domain and use-case functions.
- No `as` cast that hides an invariant. When a cast is the only way (a library type gap), comment why.
  ```ts
  // Wrong
  const id = params.pathId as PathId
  // Right
  const id = PathId.make(params.pathId)        // or Schema-decode when it comes from outside
  ```
- No `enum`: a `Schema.Literals` in the domain, or an `as const` object for UI-only values.
- Exhaustive `switch` on a union ends with a `never` check, or uses `Match` in Effect code.

## Functions and modules

- Named exports only, except where Next requires a default (`page`, `layout`, `loading`, `error`, `not-found`).
- A module exports what other modules use; everything else stays private to the file.
- Arrow functions for small pure helpers; `function` declarations for components and hooks.
- Early returns over nested `if`. No nested ternaries beyond one level in JSX; extract a variable or component.

## KISS and YAGNI

- No parameter, option, flag, generic or abstraction "for later". Add it with the second real caller.
- No generic util for one use: write it inline or private in the module that needs it.
- Minimal glue: a component with more than ~50 lines of non-JSX logic is missing a hook, a pure function or a use case.
  Move derivation into a pure function (unit-testable) and effects into a colocated hook ([react-next.md](react-next.md)).
- Delete dead code when you find it in scope; never comment it out.

## Constants and schemas

- One owner per constant, schema and message key. Search before adding ([always.md](always.md)).
- Magic numbers that encode a product decision get a named constant with a why comment
  (`/** Typing pauses this long before a page edit is sent */ const EDIT_DEBOUNCE_MS = 400`).
- Test fixtures come from factories, never copy-pasted object literals ([testing.md](testing.md)).

## Comments

- Doc comment (`/** */`) on every exported component, hook, program and Layer: one sentence on what it is for in
  product terms, as the existing files do.
- Inline comments only for why: a constraint, a browser quirk, a bug it avoids (cite `docs/bugs/<id>` when there is one).

## Pre-flight checklist

- [ ] Quotes and semicolons match the layer table; no formatter run.
- [ ] No `any`, no unexplained cast, no `enum`; unknown input decoded.
- [ ] `import type` on its own line for types.
- [ ] States are unions, not boolean bags.
- [ ] No option, generic or helper without a second caller.
- [ ] No component with ~50+ lines of logic outside JSX.
- [ ] Exported symbols have a one-sentence doc comment; inline comments say why.
- [ ] Searched for an existing constant/schema/util before adding one.
