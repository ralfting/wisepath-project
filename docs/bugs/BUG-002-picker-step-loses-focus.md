---
id: BUG-002
title: Picking a path in the Inbox's page picker sometimes leaves the keyboard on the back button
area: web/inbox
date: 2026-10-17
tags: [a11y, focus, mantine]
---

# BUG-002: Picking a path in the page picker sometimes leaves the keyboard on the back button

## Symptoms

Inbox, A on an item, Enter on a path: about one time in three the pages' search field is not focused; typing does
nothing and Enter presses the back button. Seen first as a flaky e2e step (`toBeFocused` on "Find a page").

## Root Cause

`apps/web/features/inbox/list/PagePicker/PagesStep` relied on `autoFocus`. As the paths step unmounts, its focused
field leaves the dialog; Mantine's focus trap then moves the focus to the first tabbable element it finds (the back
button), after React has run `autoFocus` on the new field. Which one wins depends on timing.

## Resolution

- Files changed: `apps/web/ui/useFocusOnMount.ts` (new), `PagePicker/PathsStep/usePathsStep.ts`,
  `PagePicker/PagesStep/usePagesStep.ts`, both steps' components
- Commit: `76e6fbb`
- Each step focuses its field a frame after mounting, after the trap has acted.

## Prevention

- `useFocusOnMount` in `ui/` for any field that replaces another inside a dialog.
- Test: `apps/web/e2e/learner.spec.ts`, "a thought captured from the Inbox is filed into a page from the keyboard",
  which presses Enter twice and checks the focus at each step.
