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
