---
id: BUG-004
title: A public path shows "Can't open this path" while it is loading
area: web/paths
date: 2026-10-17
tags: [rsc, mantine]
---

# BUG-004: A public path shows "Can't open this path" while it is loading

## Symptoms

Opening a public path's link (`/public/paths/<id>`) showed the segment's error page, "Can't open this path", although
the API answered the path. The Next server logged:

```
Error: Element type is invalid: expected a string (for built-in components) or a class/function (for composite
components) but got: undefined.
```

Found by `e2e/sharing.spec.ts` before the change was committed.

## Root Cause

`apps/web/app/public/paths/[pathId]/loading.tsx` was a Server Component and rendered `<Grid.Col>`. Mantine's
compound members (`Grid.Col`, `Menu.Item`, `Card.Section`, `Tabs.Panel`...) are static properties set on the client
component; in a Server Component the import is a client reference, which has no such properties, so `Grid.Col` is
`undefined`. The loading screen renders first, so the whole segment failed and its error boundary answered.

## Resolution

- Files changed: `apps/web/app/public/paths/[pathId]/loading.tsx`
- Commit: the one that adds the public page ("a public path is read by its link, and taken to study")
- The loading screen is a client component (`'use client'`), as Mantine's docs ask for compound components.

## Prevention

Rule in `.claude/rules/react-next.md`, "Server/client boundary": "A Server Component uses only flat Mantine
components; a compound member (`Grid.Col`, `Menu.Item`, `Card.Section`) needs `'use client'`." The public journey
in `e2e/sharing.spec.ts` loads the segment and fails without the fix.
