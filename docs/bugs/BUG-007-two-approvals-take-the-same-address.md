---
id: BUG-007
title: Approving two paths of the same title at once fails one of them
area: api/paths
date: 2026-10-23
tags: [api, postgres, concurrency]
---

# BUG-007: Approving two paths of the same title at once fails one of them

## Symptoms

Two paths with the same title (both "Rust") approved for the catalog at the same moment: one approval answers 500
and the path stays unpublished. CI saw it once two e2e specs published a "Rust" path in parallel workers. The API log:

```
Failed query: update "paths" set "slug" = $1 where "paths"."id" = $2
  [cause]: Error: duplicate key value violates unique constraint "paths_slug_key"
```

## Root Cause

`PublicationStore.assignSlug` (`apps/api/src/paths/infrastructure/DrizzlePublicationStore.ts`) reads the slugs
already taken, picks the first free one (`freeSlug`) and writes it. The approval runs in a transaction, but reading
then writing in READ COMMITTED does not stop a second approval from reading the same taken slugs before the first
commits; both pick `rust`, and the second write breaks the unique index.

## Resolution

- Files changed: `apps/api/src/paths/infrastructure/DrizzlePublicationStore.ts`,
  `apps/api/src/paths/application/PublicationStore.ts`, `apps/api/test/publications.test.ts`,
  `apps/web/e2e/contrast.spec.ts`
- What the fix does: `assignSlug` takes a transaction-level advisory lock (`pg_advisory_xact_lock`) before reading,
  so approvals pick a slug one at a time and each reads the ones committed before it. The contrast spec also
  publishes under a title of its own, so it no longer shares the catalog search of `publishing.spec.ts`.

## Prevention

`apps/api/test/publications.test.ts`, "gives maps of the same title approved at the same time an address each":
six maps titled Rust approved concurrently all get an address, each a different one. It failed 3 of 3 runs before
the fix. The port's doc comment says `assignSlug` runs inside a transaction, which the lock needs.
