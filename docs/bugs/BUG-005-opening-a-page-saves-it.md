---
id: BUG-005
title: Opening a page sends a PATCH with its unchanged text
area: web/paths
date: 2026-10-18
tags: [sync, editor]
---

# BUG-005: Opening a page sends a PATCH with its unchanged text

## Symptoms

Every time a page opened, in the drawer or as a full page, the network tab showed
`PATCH /api/paths/<pathId>/pages/<pageId>` with `{"content": "..."}`, the text exactly as stored. Nothing was typed.
The save status flashed "Saving" and the page's `updatedAt` moved on each visit.

## Root Cause

`apps/web/features/paths/editor/MarkdownEditor/useMarkdownEditor.ts`, the effect that keeps the editor's access in
step with `readOnly`. It ran on mount and called `editor.setEditable(!readOnly)`. Tiptap's
`setEditable(editable, emitUpdate = true)` emits `update` by default, with an empty transaction, so `onUpdate` passed
the unchanged markdown to `onChange`, which dispatched an `UpdatePage` command that the sync session sent.

## Resolution

- Files changed: `apps/web/features/paths/editor/MarkdownEditor/useMarkdownEditor.ts`
- `setEditable(!readOnly, false)`: changing access no longer reports the text as edited.

## Prevention

`apps/web/features/paths/editor/MarkdownEditor/MarkdownEditor.test.tsx`, "saves nothing when a page is only opened",
fails without the fix.
