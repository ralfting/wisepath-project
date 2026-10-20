---
id: BUG-006
title: Renaming a page with [ or ] in the title takes it off the map
area: web/paths
date: 2026-10-20
tags: [sync]
---

# BUG-006: Renaming a page with [ or ] in the title takes it off the map

## Symptoms

Rename a page "Foo" to "Foo []" in the drawer's title. The parent's `[[Foo]]` turns into plain text, the page moves
to "Unlinked pages", and creating "Foo" again from the parent makes a second page, so renaming back reports that
another page has the title.

## Root Cause

`renameLinks` (`packages/domain/src/paths/rules.ts`) writes the new title raw: `[[Foo []]]`. Every link parser
(`links.ts`, the editor's `wikiLink.ts`) reads a title as `[^[\]\n]+`, so that text is no link and the tree in
`tree.ts` loses the edge. The title field only turned line breaks into spaces; no schema refused brackets.

## Resolution

- Files changed: `packages/domain/src/paths/rules.ts` (`asTitle`), `packages/domain/src/paths/commands.ts`
  (`PageTitle`), `usePageTitleInput.ts`, `PageNamePrompt.tsx`, `BranchPrompt.tsx`, `inbox/rules.ts`
- What the fix does: every field a title is typed into passes it through `asTitle`, which drops `[` and `]`; the
  API refuses a page or map title holding them (`PageTitle`). `previousTitle` stays loose, so a page already
  named with brackets can be renamed away, which repairs its links.

## Prevention

`packages/domain/test/paths.test.ts` "keeps a typed title to one line without [ or ]" and
`packages/domain/test/commands.test.ts` "validates commands at the boundary".
