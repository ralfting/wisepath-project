# 9. Branch from the map

Decided in the onboarding (2026-10-16).

## Why

Adding a page meant opening its parent and typing `/Page` in the text. On the map, where the shape of the path is seen, a page should be added where it goes: on the node it branches from.

## The experience

- **On the map,** pointing at a page (or focusing it) shows a **+** on its outer edge, the way its branches grow (right on the right side, left on the left; on the root, the side with fewer branches). On touch it shows on the open page.
- **The + (or N on the focused page)** opens a small name field beside the page. **Enter** adds the branch and keeps the field open, emptied, for the next one; **⌘Enter / Ctrl+Enter** adds it and opens it in the drawer; **Esc** (or a click elsewhere) closes the field.
- **A name another page has** links that page instead of making a second one, like `/Page`.
- **In the list,** each row has the same + at its end (and N on the focused row); the field opens indented below the row. A row at the end adds a page to the root.
- **Undo** for a few seconds after each branch: the new page goes and the parent's text is as it was.

## How it works

Same model as before: links are the structure. Adding a branch is two edits through the map's session: a new page (unless the name exists), and a `[[Name]]` line at the end of the parent's text. The new branch comes last among its siblings, since the order follows the order of the links in the text.

- Domain: `addBranch(project, parentId, title, newId)` in `packages/domain/src/projects/commands.ts`, unit tested; `withLinkTo` moves to `projects/links.ts`, shared with the Inbox's "make it a page".
- Web: `useProject`'s actions gain `addBranch` (returns the page and whether it was new) and `undoBranch`.
- `MindMap` and `MapList` render the +, take N, and show the name field.

## Checks

- Unit: a new branch, a taken name linking the existing page, an empty name refused, the parent's text keeps what it had.
- Browser: hover → + → name → Enter → node on the map; N from the keyboard; ⌘Enter opens the drawer; Esc; the list; Undo; axe light and dark.

## Later: moving a page

Also from the onboarding: moving a page to another node, to rearrange a path. Decided so far: moving rewrites the links (the old parent's `[[link]]` goes, the new parent gets one), so the markdown stays the source of truth. Open: what the old link becomes (plain text or removed).
