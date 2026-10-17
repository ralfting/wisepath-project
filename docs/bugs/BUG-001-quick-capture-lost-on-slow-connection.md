---
id: BUG-001
title: A quick capture made away from the Inbox is lost on a slow connection
area: web/inbox
date: 2026-10-17
tags: [effect, atoms, inbox]
---

# BUG-001: A quick capture made away from the Inbox is lost on a slow connection

## Symptoms

From the map or any page but the Inbox, ⌘⇧Space, type, Enter: the toast says "Saved to the Inbox" and the Inbox
count goes up, but after a reload the item is gone. Only when the request took more than about half a second; in
the browser's network panel, `POST /api/inbox` shows as cancelled (`net::ERR_ABORTED`).

## Root Cause

`apps/web/features/inbox/capture/QuickCapture/useQuickCaptureForm.ts` (as of `f8602d8`) called `useCapture()`,
so the capture atom (`captureAtom` in `useCases/inbox/inbox.ts`) was mounted only by the form. Enter closes the
palette before the capture is sent, and the palette unmounts the form. With nothing else reading the atom, the
registry drops its node after its idle time, and dropping a `fn` atom interrupts the Effect still running in it,
which cancels the fetch. On the Inbox page another hook reads the same atom, so it never showed there.

## Resolution

- Files changed: `apps/web/features/inbox/capture/QuickCapture/QuickCapture.tsx`, `useQuickCaptureForm.ts`,
  `QuickCaptureForm.tsx`
- Commit: `eb125b2`
- `useCapture` and `useFileItem` live in `QuickCapture`, which stays mounted; the form gets them as `savers`.

## Prevention

- Rule in `.claude/rules/react-next.md`: "A hook whose atom runs work that outlives the form (fire and forget, not
  awaited before closing) lives in the container that stays mounted, never in the remounting form."
- Test: `apps/web/e2e/learner.spec.ts`, "a thought captured on another page reaches the Inbox, even when the
  connection is slow" (holds the POST 1.5 s, checks the API and that nothing was aborted).
