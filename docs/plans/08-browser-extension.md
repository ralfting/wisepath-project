# 8. Browser extension (later)

**Not soon.** Noted from the onboarding (2026-10-16) so the idea isn't lost; it comes after the deploy, and is to be planned in full when its turn comes.

In place of the bookmarklet of [plan 2](02-web-capture.md), which was removed from the app meanwhile; its code is in the history to reuse.

## Why

The bookmarklet has to be dragged to a bookmarks bar many people keep hidden, works only by a click, opens a loose popup a browser may block, and some sites' rules stop it. An extension is installed with one click and lives in the browser.

## What it would give

- **A keyboard shortcut** on any site (the browser's commands, e.g. ⌘⇧S), besides the toolbar icon.
- **The right-click menu:** "Send to WisePath" on a selection, a link or an image.
- **Its own popup** under the icon, filled in like the capture window: title, site, the selection as a quote, the YouTube moment; a note of your own; Enter sends, Esc closes.
- **The Inbox count** on the icon.
- Works on sites that block bookmarklets, and reads the video's moment from the page itself.

## How it might be built

- [WXT](https://wxt.dev) (Manifest V3): one code base for Chrome and Edge first, then Firefox; Safari (an Apple developer account and Xcode) much later, if at all.
- A new `apps/extension` in the monorepo, reusing the capture API (`POST /api/inbox`) and, from plan 2's history, how a web page becomes an Inbox item (title, selection cut to 3000 characters, video time).
- Signed in through the app's session cookie: the extension's `host_permissions` on the API's address let it send the cookie, so it needs no login of its own; logged out, it opens the app's login.
- Needs the public API address, so it waits for the deploy.

## Open when it is planned

1. Publishing: Chrome Web Store (one-off US$5 fee, a review on every version) and Firefox Add-ons.
2. Which shortcut, so it clashes with no common one.
