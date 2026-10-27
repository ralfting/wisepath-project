---
id: BUG-008
title: A citation chip, and a link to a missing page, show in the link's blue instead of dimmed
area: web/editor
date: 2026-10-27
tags: [css]
---

# BUG-008: A citation chip, and a link to a missing page, show in the link's blue instead of dimmed

## Symptoms

In the page editor, light and dark, an `@[[Title]]` citation drew with its dotted line and quote mark but in the
same blue as a `[[link]]`, and a link to a page not made yet stayed blue with its dashed line. Computed `color` of
`span.wikilink.wikilink-citation` was the link's `--mantine-color-blue-8` (light) or `blue-4` (dark), not
`--mantine-color-dimmed`.

## Root Cause

`apps/web/features/paths/editor/MarkdownEditor/WikiLinks.module.css` (moved there from `MarkdownEditor.module.css`)
set the chip's colour with `light-dark(var(--mantine-color-blue-8), var(--mantine-color-blue-4))` on
`.content :global(.wikilink)`. `postcss-preset-mantine` compiles `light-dark()` into two rules, each prefixed with
`[data-mantine-color-scheme='light']` or `'dark'`, one attribute selector more specific than the rule as written.
The quieter rules for `.wikilink-citation` and `.wikilink-missing`, written later with the same selector shape,
lost to it whatever their order.

## Resolution

- Files changed: `apps/web/features/paths/editor/MarkdownEditor/WikiLinks.module.css`
- Commit: `fix(web): show a citation chip, and a missing page's, in the dimmed colour`
- The blue goes into a variable, `--wp-link-chip`, set with `light-dark()` on the editor's content; the chip reads it
  with one class, so the modifier rules after it override the colour as written.

## Prevention

Rule added to `.claude/rules/ui-patterns.md`, "Styling": "`light-dark()` compiles into one rule per scheme, one
attribute more specific: on a property a modifier class overrides, set it in a variable on the container and read the
variable." No test: the component tests run in happy-dom, which does not compute module CSS; plan 23's browser check
compared the chip's computed colour with `--mantine-color-dimmed`.
