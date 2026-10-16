# 2. Capture from the web

**Removed from the app (2026-10-16).** It was built as below, then taken out after the onboarding: a bookmarklet is awkward to set up and use. Capturing from other sites comes back as a browser extension, [plan 8](08-browser-extension.md); the code is in the history (commits `332c8a3` to `d1d85d6`) to reuse there.

Depends on [plan 1](01-inbox-quick-capture.md): it saves into 1's Inbox.

## Why

Most studying happens outside WisePath: a docs page, an article, a YouTube video. Getting what matters from there into a path should be one click, without switching tabs to write it.

## The experience

- A **bookmarklet** ("Send to WisePath"), dragged once to the bookmarks bar from a page in the app's settings. On any site, a click opens a small WisePath window (a popup, 420 × 360) already filled in:
  - the page's title and address;
  - the selected text, if any, as a quote;
  - on YouTube, the video's current moment (`[12:34]`), read from the page's player.
- The window has one field for a note of one's own. Enter sends it to the Inbox and closes the window; Esc closes it.
- Logged out, the window shows the login first, then the filled-in capture.

## Why a bookmarklet and a capture page (not an extension, for now)

The app's session is an httpOnly cookie for the app's own origin, and the API only accepts calls from it (CORS). A script running on another site can't call the API with that session. A popup opened on the app's own `/capture` page can: it is WisePath, logged in, posting as usual. It works in every browser, needs nothing installed beyond a bookmark, and no store review. A browser extension (and a share target on phones) can come later, opening the same `/capture` page.

## Scope for v1

In: the bookmarklet, the `/capture?url=&title=&text=&t=` page, YouTube's moment, the settings entry that explains and offers it.
Out: a browser extension, phones (PWA share target), capturing images.

## Web

- `app/capture/page.tsx`: reads the query, shows the filled-in card (title, address with icon, quote, moment, note field), sends through 1's `useCapture()`, then `window.close()` (with a "Saved, you can close this" fallback when the browser keeps it open).
- The bookmarklet's code (`features/capture/bookmarklet.ts`), built from a function and offered as a draggable link in settings. It reads `document.title`, `location.href`, `getSelection()`, and on YouTube `document.querySelector('video')?.currentTime`; it opens `/capture` with them, cut to a safe length.
- Nothing new in the API: it is 1's `POST /api/inbox`.

## Checks

- Unit: the bookmarklet's query building (long selection cut, YouTube moment, no selection).
- Browser: open `/capture` with each kind of query; send; the Inbox has it; logged out, it goes through login and back; axe.
- By hand, once: the bookmarklet on a real article and a real YouTube video.

## Open decisions

1. Where the bookmarklet lives: a "Capture from the web" page in settings (recommended) or the Inbox's empty state?
2. A YouTube moment filed to a page that has that video: under the video as a note `[12:34]` (recommended), or as a link with `?t=`?
