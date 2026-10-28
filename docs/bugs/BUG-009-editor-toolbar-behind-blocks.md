---
id: BUG-009
title: The editor's toolbar goes behind a question, a callout, a code block or a video scrolled under it
area: web/editor
date: 2026-10-28
tags: [css]
---

# BUG-009: The editor's toolbar goes behind a question, a callout, a code block or a video scrolled under it

## Symptoms

Writing a long page, on the full page and in the drawer, light and dark: as the text scrolls under the sticky
toolbar (H2, H3, lists, code, quote, video, `[ ]`, table, help), plain paragraphs pass beneath it but a question,
an activity, an info callout, a code block or a video paints over it and takes its clicks. With a question under
the toolbar, `document.elementFromPoint` at the H2 button returned `div.QuestionBlock_root`, not the button; a
sweep down the page missed the toolbar at 594 of 946 sampled points on the full page and 320 of 1023 in the drawer.

## Root Cause

The toolbar and the text's blocks shared one stacking context. Mantine's tiptap styles give the sticky toolbar
`z-index: 1` and every `div` inside the content `z-index: 2` (`.m_c2204cc2 div:not(.ProseMirror)`, meant for the
bubble menu). A plain paragraph is not positioned, so the z-index never applies and it paints below the toolbar.
Our own node views are positioned: the callout's `.block` (`position: relative; z-index: 3`, raised over the cursor
rail in `a8bd6af` for the grip) and the code block's and video's `NodeViewWrapper` (`position: relative`, so
Mantine's `2` takes effect). Each of those outranks the toolbar's `1`, so whichever block scrolls under it is
drawn on top. Raising one block's z-index for a local reason silently put it over the toolbar.

## Resolution

- Files changed: `apps/web/features/paths/editor/MarkdownEditor/MarkdownEditor.module.css`
- Commit: `fix(web): keep the editor toolbar above the blocks scrolled under it`
- `.content` gets `isolation: isolate`. The text is now one stacking context that sits at level 0 beside the
  toolbar, so any z-index inside it (callouts over the rail, the video's layers) orders blocks among themselves
  and can no longer reach the toolbar's `1`. The selection bubble (a tippy box outside the content), the slash
  menu, the `[[` picker and the link card live outside the content and still open over the toolbar; the floating
  video, `position: fixed` inside the content, still floats over the text in its corner below the toolbar.

## Prevention

`apps/web/e2e/questions.spec.ts`, "the editor toolbar stays above a question the page scrolls under it": scrolls a
question under the stuck toolbar and asserts `elementFromPoint` at the Heading button lands on the button. It
fails without the isolation rule. A why-comment sits on the rule itself. A happy-dom test can't catch this: it does
not compute layout or stacking.
