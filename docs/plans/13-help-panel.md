# 13. Help: what can I do here

Decided 2026-10-16.

## Why

New learners don't find how to add a page or take notes on a video. The (?) in the editor's toolbar explains Markdown only. A help that shows, in a few seconds of video, how the main things are done teaches them where they are.

## The experience

- **Help** in the sidebar, above the account, with a (?) icon; on the collapsed rail, the icon alone with a tooltip.
- It opens a panel, **What can I do here**, whose content follows the screen:
  - **A page** (open in the drawer or full): two topics, each a short looping clip (5–10 s, muted, no controls needed) with two or three lines:
    - **Add a page**: type `/`, choose Page, name it, Enter; or write `[[Name]]` and click it.
    - **Video notes**: paste a YouTube link on its own line; while watching, notes are stamped with the moment.
  - **The map**: text only for now (moving around, adding a branch with + or N, the list view).
  - **My paths**: text only for now (projects, new path, dragging a path to another project).
- Clips come in English and Brazilian Portuguese, by the app's language. They play on open and respect reduced motion (shown paused, with a play button).
- The editor's (?) stays as it is: Markdown only.

## How it works

- **Clips** are made with HyperFrames from the real app (screens captured from a local run with the demo account), rendered to MP4 (H.264, small, no audio) plus a poster image, under `apps/web/public/help/<topic>.<locale>.mp4`. Sources live in `videos/help-<topic>/` (kept out of git, like the other video projects).
- **Web:** `features/help/HelpPanel.tsx` (a Mantine Drawer from the right), `HelpButton` in `AppFrame`'s sidebar; which screen we are on comes from the route (`/paths/:id/pages/:pageId` and the drawer → page; `/paths/:id` → map; `/paths` → home). Messages under `help` in en and pt-BR.

## Steps

1. Help button and panel with the text for the three screens.
2. Clips: Add a page, Video notes, each in en and pt-BR, rendered and placed in `public/help/`.
3. Clips wired into the page topics; docs (FEATURES).

## Checks

- Typecheck, lint, tests.
- Browser: the button on each screen opens the right topics; clips load and loop in the app's language; the rail's icon; the panel closes with Esc; axe on the panel.
