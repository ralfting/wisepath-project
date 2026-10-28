---
id: BUG-012
title: A question's description still drops out of it in production after BUG-010's fix shipped
area: web/build
date: 2026-10-28
tags: [markdown, editor, build]
---

# BUG-012: A question's description still drops out of it in production after BUG-010's fix shipped

## Symptoms

In production, after the BUG-010 fix was deployed (ebd2140), an author writes /question, a title in the small
heading, Enter, a description in italics, Enter, a third block. They leave the page and open it again: the
description sits below the question as `*> description...`, and the blocks after it read as a quote of their own.
The stored markdown, as the unpatched serializer writes it, right after typing and once saved again:

```
> [!question]
> ### Title

*> *Description.*
>
> Third block.
```

```
> [!question]
> ### Title

\*&gt; *Description.*

> Third block.
```

On a local build with a clean cache, the same steps (drawer and full page, italics typed or applied afterwards,
italic first or third block, a list) save correctly.

## Root Cause

Production never ran the patch. The editor chunk served by wisepath-web.vercel.app holds
`markString(e,t,n,r){...if(t)this.inlines.push({start:this.out.length,...` with no `this.write()` before it. The same
deployment carries code from after the patch (the outline's "Answered question"), and its Vercel build log shows
`pnpm install` adding the patched package. That log also shows "Restored build cache from previous deployment",
which was built before the patch existed.

webpack's persistent cache (`.next/cache/webpack`, which Vercel restores) treats `node_modules` as managed paths. It
checks a package only by name and version, and a pnpm patch changes the files without changing `0.8.10`. So the
module, or where it resolved, came from the cache. Reproduced locally in a separate worktree: a build with the
pre-patch lockfile, then `pnpm install` with the patch and a second build over the same cache, ships chunk
`6913-60b868c9e47b9d8b.js` with the unpatched `markString`. That is the same chunk name production serves. Deleting
`.next/cache` and building again ships the patch. BUG-010's note about a dev server keeping the old module had
the same cause.

## Resolution

- Files changed: `apps/web/next.config.js`, `apps/web/features/paths/editor/markdown.ts`,
  `apps/web/features/paths/editor/callout.ts`
- `next.config.js` adds the root `pnpm-lock.yaml` to webpack's `cache.buildDependencies`. The lockfile records
  each patch's hash (`patchedDependencies`), so adding, changing or removing a patch, or any dependency change,
  starts the cache over. A build with an unchanged lockfile still reuses it. With the change, the same two-build
  experiment ships the patched `markString`.
- Pages saved broken in production heal when read. `withQuoteBlocksBack` (`features/paths/editor/markdown.ts`)
  runs as a markdown-it core rule ahead of every parse (`CalloutBlock`'s `parse.setup`). It handles each shape the
  unpatched serializer wrote:
  - a line `*> *` or `\*&gt; *` one blank line under a quote goes back into it. In the second form, the quote that
    follows it is joined back as well, unless it is a callout of its own.
  - `> ****` and `> \*\***` at a line's start, and ` \*\***` in the middle of a quote line, become a new bold block.
  Markdown the editor writes today has none of these shapes and is left alone. A second pass changes nothing. The
  page opens whole, and the next edit saves it whole. No data was changed.

## Prevention

- `apps/web/next.config.js`: the lockfile is a build dependency of webpack's cache.
- `apps/web/features/paths/editor/callout.test.ts`: "reads …, saved with a block fallen out of its quote, whole
  again". Each case is a form the unpatched serializer wrote. Every one failed before the repair.
- `apps/web/features/paths/editor/markdown.test.ts`: correct markdown is left as it is, and the repair is idempotent.

What is left: a page the repair cannot tell apart. Saved twice, a block after the fallen one becomes a separate
quote, and the repair joins it back into the callout. A plain quote that the author placed right after that
callout, one blank line below, would be joined in too.
