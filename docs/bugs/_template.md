---
id: BUG-000
title: One line, the symptom in product words
area: web/<domain or feature>
date: YYYY-MM-DD
tags: [css, hydration, sync, i18n, effect, auth, a11y]
---

# BUG-000: Title

## Symptoms

What a learner or a test observed, reproducible: steps, screen, browser, light/dark, locale.
Paste the exact error text if there was one; it is what the next person will search for.

## Root Cause

The file and function (`apps/web/...:line`), and **why** it happened: the assumption that was wrong, the order or
timing that broke it. Not just "X was null".

## Resolution

- Files changed: `path`, `path`
- Commit / PR: `<sha>` or `#<number>`
- What the fix does, in one or two sentences.

## Prevention

The rule added to `.claude/rules/<file>.md` (quote it) and/or the test that now fails without the fix
(`path/to/X.test.ts`, test name). "None" needs a reason.
