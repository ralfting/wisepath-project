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
| [BUG-004](BUG-004-mantine-compound-in-server-component.md) | A public path shows "Can't open this path" while it is loading | web/paths | 2026-10-17 |
| [BUG-003](BUG-003-helpers-lost-use-client.md) | The build fails with "createContext only works in a Client Component" after a split | web/build | 2026-10-17 |
| [BUG-002](BUG-002-picker-step-loses-focus.md) | Picking a path in the page picker sometimes leaves the keyboard on the back button | web/inbox | 2026-10-17 |
| [BUG-001](BUG-001-quick-capture-lost-on-slow-connection.md) | A quick capture made away from the Inbox is lost on a slow connection | web/inbox | 2026-10-17 |
