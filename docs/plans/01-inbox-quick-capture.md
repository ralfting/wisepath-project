# 1. Inbox and quick capture

## Why

Writing something down today means choosing its path and page first. An idea, a link or a question met mid-study is lost while the right page is found. Capture should take one shortcut and two seconds; filing it can wait.

## The experience

- **⌘⇧Space** (Ctrl+Shift+Space), anywhere in the app, opens a small capture box in the middle of the screen: one field, multi-line with Shift+Enter. Enter saves it and closes; Esc closes without saving. A pasted address is kept with its title (from the link preview).
- What was captured goes to the **Inbox**, one per learner (not per path): a page in the sidebar, above the paths, with a count of what is waiting.
- In the Inbox each item shows its text, its source (address with the site's icon, or "Written in WisePath") and when it came in. Per item:
  - **File to…** picks a path and a page (a searchable list, the current path first). The item is appended to that page's text as markdown and leaves the Inbox.
  - **Make it a page** in a chosen path: a new page titled from the item, linked from the chosen page.
  - **Delete.**
- Filing from the keyboard: ↑ ↓ through the items, F file, D delete, Enter open the source.
- Opened from a page (drawer or full page), the capture box offers "Add to this page" as well: Enter files it straight there.

## Scope for v1

In: the capture box, the Inbox with File to / Make it a page / Delete, keyboard filing, the sidebar count.
Out: tags, reminders, capturing images or files, capture from outside the app (that is [plan 2](02-web-capture.md)).

## Model

- `packages/domain/src/inbox/`: `InboxItem { id, text, url?, title?, videoTime?, createdAt }`. Commands `Capture` and `Discard`; `fileItem(project, pageId, item)` returns the project with the item appended to the page's markdown (a pure rule, tested): an address becomes a line with the address; a `videoTime` becomes `[mm:ss]` under the video when the page has that video, otherwise the address with `?t=`.
- Filing changes two things (the page and the Inbox): the web edits the page through the map's sync session as usual (`UpdatePage`), then discards the item.

## API

- Table `inbox_items (id, owner_id, text, url, title, video_time, created_at)`.
- `CaptureApiGroup` under `/api/inbox`: `GET /` (newest first), `POST /` (`{ id, text, url?, title?, videoTime? }`, idempotent on id), `DELETE /:id`.

## Web

- `useCases/inbox/`: an inbox atom, `useCapture()`, `useInbox()`, `useFileItem()` (edits the target page through its session, then discards).
- `features/capture/CaptureBox.tsx`: the palette shell (centred card, focus trapped, Esc closes) that [plan 4](04-global-search.md) reuses for ⌘P. Opened by a hotkey in `AppFrame`.
- `features/inbox/InboxPage.tsx` at `/inbox`, and the sidebar entry with its count.

## Checks

- Domain: `fileItem` for plain text, an address, a video moment with and without that video on the page.
- API: capture, list, idempotent retry, delete, another user's items invisible.
- Browser: ⌘⇧Space from the map, a page and the home; capture, file to a page (text appears there, item gone), make a page, delete; keyboard only; axe.

## Open decisions

1. One Inbox per learner (recommended: capture shouldn't ask where) or one per path?
2. When filing, append at the end of the page (recommended) or under a heading such as "Inbox" in that page?
