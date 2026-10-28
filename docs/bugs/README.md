# Bugs

Known bugs with a non-obvious root cause, so the next person (or agent) finds the cause before re-investigating.

## Before investigating

```bash
rg -n -i "<words from the symptom or error>" docs/bugs/
```

## After fixing

1. Copy [_template.md](_template.md) to `BUG-<next number>-<short-slug>.md` (next number: highest in the table + 1).
2. Fill every section. **Prevention** links the rule or test that now catches it.
3. Add a row below, newest first.

Skip it for typos and bugs whose cause is obvious from the diff.

## Index

| Id | Title | Area | Date |
|---|---|---|---|
| [BUG-012](BUG-012-patched-package-left-out-of-the-build.md) | A question's description still drops out of it in production after BUG-010's fix shipped | web/build | 2026-10-28 |
| [BUG-011](BUG-011-youtube-preview-without-title.md) | A YouTube video's link preview has no title, so the outline lists it as "Video" | api/links | 2026-10-28 |
| [BUG-010](BUG-010-callout-block-falls-out.md) | A question's italic line under its heading drops out of the question after a reload | web/editor | 2026-10-28 |
| [BUG-009](BUG-009-editor-toolbar-behind-blocks.md) | The editor's toolbar goes behind a question, a callout, a code block or a video scrolled under it | web/editor | 2026-10-28 |
| [BUG-008](BUG-008-light-dark-outranks-a-modifier.md) | A citation chip, and a link to a missing page, show in the link's blue instead of dimmed | web/editor | 2026-10-27 |
| [BUG-007](BUG-007-two-approvals-take-the-same-address.md) | Approving two paths of the same title at once fails one of them | api/paths | 2026-10-23 |
| [BUG-006](BUG-006-brackets-in-a-title-unlink-the-page.md) | Renaming a page with [ or ] in the title takes it off the map | web/paths | 2026-10-20 |
| [BUG-005](BUG-005-opening-a-page-saves-it.md) | Opening a page sends a PATCH with its unchanged text | web/paths | 2026-10-18 |
| [BUG-004](BUG-004-mantine-compound-in-server-component.md) | A public path shows "Can't open this path" while it is loading | web/paths | 2026-10-17 |
| [BUG-003](BUG-003-helpers-lost-use-client.md) | The build fails with "createContext only works in a Client Component" after a split | web/build | 2026-10-17 |
| [BUG-002](BUG-002-picker-step-loses-focus.md) | Picking a path in the page picker sometimes leaves the keyboard on the back button | web/inbox | 2026-10-17 |
| [BUG-001](BUG-001-quick-capture-lost-on-slow-connection.md) | A quick capture made away from the Inbox is lost on a slow connection | web/inbox | 2026-10-17 |
