---
id: BUG-010
title: A question's italic line under its heading drops out of the question after a reload
area: web/editor
date: 2026-10-28
tags: [markdown, editor]
---

# BUG-010: A question's italic line under its heading drops out of the question after a reload

## Symptoms

An author writes a question with /question, types its words in the small heading, presses Enter and types a line of
help under it in italics. The editor shows the heading, the italic line, then the answer field. After leaving the page
and coming back (or reloading), the italic line sits below the answer field, outside the question, starting with a
stray `*>`. The saved markdown was already wrong right after typing:

```
> [!question]
> ### What does the borrow checker stop?

*> *Think of two writers at once.*
```

It is not the question alone: any block inside a callout or a plain quote, after another block, whose text opens with
italics (`*`, `_`) loses its quote and falls out. Opening with bold (`**`) eats the blank `>` line instead: the block
stays inside but shows a literal `**`, and after a paragraph the two paragraphs merge into one. Plain text, links,
code and wiki links at the start of the block are not affected, which is why plain descriptions round-tripped fine.

## Root Cause

`tiptap-markdown` 0.8.10, `MarkdownSerializerState.markString` (`src/serialize/state.js`). For marks that expel
their surrounding white space (bold, italic) it records where the mark opens as `this.out.length`, then after the
text node `trimInline` moves the delimiter forward until it can open, by the CommonMark flanking rules. But
`prosemirror-markdown` calls `markString` before `write()`, and `write()` is what flushes the previous block's close
and the line's prefix. So `start` points before `\n>\n> `, not at the `*`. `normalizeInline` skips only white space,
so inside a quote `start` lands on a `>`; `trimInline`, taking the character at `start` for the delimiter, deletes
that `>` and puts a `*` after it. At the top level the pending text is only `\n\n`, which is skipped, so the bug shows
only where a line prefix holds something other than spaces: quotes and callouts. Upstream 0.9.0 has the same code
(and needs Tiptap 3).

## Resolution

- Files changed: `patches/tiptap-markdown@0.8.10.patch`, `package.json` (`pnpm.patchedDependencies`),
  `pnpm-lock.yaml`
- Commit: `fix(web): keep a callout's blocks inside it when one opens with italics or bold`
- The patch calls `this.write()` in `markString` before recording an opening mark's start, so the pending close and
  the `> ` prefix are written first and `start` is where the mark opens. `text()` calls the same `write()` right after,
  so the output is otherwise unchanged.
- The patch did not reach production: Vercel restored a webpack cache built before it, which kept the unpatched
  module (BUG-012). A dev server started before the patch kept it the same way. The lockfile is now a build
  dependency of that cache.

### Pages already saved in the broken form

Since BUG-012, the editor puts these blocks back when it reads a page, and the next edit saves the page whole. What
follows is how they looked before that.

The editor reads them back with the block outside the callout, and the domain reads the question's words from the
heading alone, so their answers stay attached to that question. They are recognisable: a line starting with `*> ` or
`_> ` right after a blank line that follows a quote (italic), or a quote line starting with `****` or `____` (bold).
Once such a page is saved again the stray text is escaped (`\*&gt; *…*`). The italic form can be repaired by putting
the line back in the quote with a blank `>` line before it and dropping the stray delimiter; the bold form can't tell
which paragraphs were merged. No migration was run. Repairing an affected question in the editor by hand changes its
words, and `rewordedQuestions` moves its answers to the new name on save.

## Prevention

`apps/web/features/paths/editor/callout.test.ts`: "keeps every block of … inside its callout, read and written back
the same" (every callout kind, a heading or paragraph followed by an italic or bold block and a list), "keeps a plain
quote whole when its second paragraph opens with a mark", and "writes a question typed as a heading and an italic line
under it as one question, read the same by the domain". They fail without the patch. The domain
(`packages/domain/test/questions.test.ts`) and the catalog (`MarkdownText.test.tsx`) tests pin that both read every
block of a callout as one.
