# Plans: faster capture and review

Four features to make taking notes and reviewing them quicker, and WisePath part of the day rather than a place to visit. Each has its own plan; this page is how they depend on each other and how to build them.

| # | Plan | In one line |
| --- | --- | --- |
| 1 | [Inbox and quick capture](01-inbox-quick-capture.md) | ⌘⇧Space anywhere in the app: write it now, file it later |
| 2 | [Capture from the web](02-web-capture.md) | A bookmarklet sends the page, the selection or the video's moment to the Inbox |
| 3 | [Spaced review](03-spaced-review.md) | `Question :: Answer` lines become cards; a few minutes of review a day |
| 4 | [Search everywhere](04-global-search.md) | ⌘P finds any page in any path, by title or text |
| 5 | [Languages (i18n)](05-i18n.md) | English and Portuguese, following the browser, chosen on the account |
| 7 | [Page templates](07-page-templates.md) | A page laid out from the concept to the practice, with hints and ⌘↓ |
| 8 | [Browser extension](08-browser-extension.md) | Later, not soon: capture from any site by a shortcut, the right-click menu or the toolbar, replacing the bookmarklet |

AI (10) comes last, once these exist to build on.

## Dependencies

```
5 i18n ──▶ everything (all new text goes through it)
1 Inbox ──(capture API + Inbox page)──▶ 2 Web capture
3 Spaced review      (independent)
4 Search everywhere  (independent; shares the command palette with 1)
7 Page templates     (the editor; its Questions section feeds 3)
```

- **2 needs 1:** the bookmarklet only opens the app's capture page, which saves through 1's capture command into 1's Inbox.
- **1 and 4 share one thing:** a command palette in the app frame (⌘⇧Space for capture, ⌘P for search). Build the palette shell once, in 1, and 4 adds its mode to it; or agree its props up front.
- **3 shares nothing** but the editor (it styles `::` lines) and a new table.

## Building them in parallel (Orca)

Recommended, in three steps, one Orca worktree and agent per plan:

0. **First, alone:** 5 (i18n). It touches every screen, so nothing runs beside it.
1. **Wave 1, in parallel:** 1 (Inbox), 3 (Spaced review), 4 (Search), 7 (Templates). They touch different screens (7 stays in the editor); their shared ground is listed below.
2. **Wave 2:** 2 (Web capture), once 1's capture command is merged. It is small.

Each agent works on a branch in its own worktree and merges into `main` when its plan's checks pass; a person (or this session) merges them one at a time. That keeps them from undoing each other's work, which happened when two sessions edited the same files on `main`.

Shared ground to handle on purpose:

- **Database migrations.** Each plan adds a table; Drizzle numbers migrations in order, so two branches would both make `0002_*`. Each agent generates its migration only after rebasing on the latest `main`, right before merging.
- **The contract** (`packages/contract/src/WisePathApi.ts`) gets a new group per plan (`CaptureApiGroup`, `ReviewApiGroup`, `SearchApiGroup`): one line each in the same file, an easy merge.
- **The sidebar** gets an Inbox link (1) and a Review link (3): neighbouring lines in `AppFrame.tsx`.
- **The command palette** (1 and 4): 1 builds it; 4 starts once 1's palette is merged, or builds its search as a separate component that 1's palette hosts.
- **Messages** (`apps/web/i18n/messages/en.ts`, `pt-BR.ts`): every plan adds keys under its own prefix (`inbox.`, `review.`, `search.`, `templates.`), so merges only add lines.
- **The editor** (3's card marks and 7's templates): 3 adds a decoration, 7 an extension and a slash command; both register in `MarkdownEditor.tsx`'s extension list.

## Every plan is done when

- The domain rules are unit tested (`packages/domain`), the API has tests against the local database (`apps/api/test`), and the web's use cases have tests where they hold logic.
- A browser check walks the feature as a learner would (keyboard included) and axe reports nothing, light and dark.
- `docs/FEATURES.md` describes it, with its shortcuts.
- Markdown stays the source of truth for what a learner writes in a page.
