---
id: BUG-003
title: The build fails with "createContext only works in a Client Component" after splitting a component
area: web/build
date: 2026-10-17
tags: [next, rsc, use-client]
---

# BUG-003: The build fails with "createContext only works in a Client Component" after a split

## Symptoms

`next build` fails: "You're importing a component that needs `createContext`. This React Hook only works in a
Client Component", with an import trace through `features/paths/page/index.ts` to
`app/paths/[pathId]/@drawer/(.)pages/layout.tsx`. Typecheck, lint and unit tests all pass.

## Root Cause

Splitting `PageDrawer.tsx` (a `'use client'` file) moved its React context into `PageDrawer.helpers.ts`, a `.ts`
file without the directive. The drawer's layout is a Server Component and imports the page feature's index, which
re-exports from the helpers, so `createContext` reached the server graph. HelpPanel's and SearchPalette's helpers
had the same problem with a context and a hook.

## Resolution

- Files changed: the three `*.helpers.ts` files
- Commit: `575ac2d`
- The helpers that create context or call hooks start with `'use client'`.

## Prevention

- Rule in `.claude/rules/ui-patterns.md` ("A `.helpers.ts` that creates context or calls hooks starts with
  `'use client'`").
- `next build` is part of the checks before every commit: only the build sees the server/client graph.
