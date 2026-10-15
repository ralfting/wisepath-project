# WisePath features

What the app does today, as a learner meets it. The product's intent and principles are in [PRODUCT.md](../PRODUCT.md); how the code is laid out is in the [README](../README.md).

Markdown is the source of truth throughout: everything below is either stored as plain markdown in a page (links, times, videos, code) or is a way of showing that markdown. Nothing is kept beside it.

## Paths

A **path** is one subject being learned. Its centre page carries the subject's name; every other page hangs off it through `[[links]]`.

- **Two kinds.** A **Study** is open notes organised as a map: no progress, nothing to finish. A **Learning path** is followed page by page, with "I've studied this" on each page, a progress ring, and "Start / Continue studying" opening the next page in map order. New paths are Studies unless chosen otherwise in the New path dialog.
- **Switching kind** from the path's ⋯ menu (on its home card, or beside its title on the map) keeps the studied marks: a Study hides them, a Learning path shows them again.
- **Home (My paths):** one card per path. A Learning path shows its progress bar, the next page and the Continue button; a Study shows its size ("57 pages · 10 modules"). Searchable by title or description. Delete from the card's menu.
- **Sidebar:** every path, with its progress for Learning paths. Collapses to an icon rail that floats open on hover; on the rail a Learning path's icon has a thin progress ring.

## The map

The map is a reading of the links, never stored on its own.

- **Layout.** A horizontal mind map: the centre page in the middle, its branches split left and right, each level a column further out. The first link that reaches a page makes it a branch of the linking page; any other link is drawn as a faint arrow, which brightens for the open page or the one under the pointer. Pages no link reaches are **orphans**, listed apart.
- **Modules.** Any page can be shown as a module: drawn larger, with a colour and an icon (set on the page's icon). Pages below a module take its colour.
- **List view.** The same tree as an indented list (the default on phones).
- **Search (⌘K / Ctrl K).** Lists the pages that match, each with where it sits ("In Providers"); the map highlights them and follows the one marked with the arrows; Enter opens it. A click outside folds the search and keeps its filter.
- **Keyboard.** The map is one Tab stop, then a tree: → and ← follow the branches as drawn (out and back in), ↑ and ↓ move between siblings, Home goes to the centre, Enter or Space opens a page.
- **Zoom** opens at a size titles can be read at; − / + / fit to screen / centre on the root are in the corner, with a legend.

## Pages

- **Drawer.** A page opens in a drawer beside the map; its URL is the page's own, so Back closes it and a reload opens the full page. Another page (from the map, search or Related) replaces it at once. Expand grows it into the full page in place. Esc closes it (a menu or popup open in it closes first); the focus goes back to the page on the map.
- **Opened from the keyboard,** the focus is on the title (so the page is announced and keys don't land in its text); opened with a click, the cursor waits at the end of the text, ready to write. Tab past the drawer's end goes back to the map.
- **Related tab:** where the page branches from, its branches, the pages it links to and those linking to it. Pointing at one rings it on the map and singles out its link.
- **Title.** Edited in place; links to the page follow the new name when editing ends, and the page never shows as an orphan meanwhile. A title another page has is refused (links would be ambiguous). Enter moves on to the text.
- **Outline.** With two headings or more, a rail of dashes on the right edge; hovering it lists the headings ("On this page"), and it works from the keyboard.
- **Delete** from the page's ⋯ menu: links to it become plain text, and pages only it reached become orphans.

## Writing

The editor shows formatting as you type and saves markdown. The **?** in its toolbar lists the markdown it understands.

- **`[[Page]]`** links another page of the path (shown with a book icon); a name that doesn't exist yet is shown dashed and offers to create the page. Typing `[[` opens a picker of pages; a new name there creates it.
- **`/` commands:** headings, lists, checklists, code, quote, table, video, and Page, which asks for a name, links it and goes to it (Cmd/Ctrl+Enter stays here).
- **Tables:** a markdown header row (`| A | B |`) then Enter makes a table with a row to fill; pasted markdown tables work too.
- **Code blocks** have syntax colours, and the language in their top corner: a searchable picker (TypeScript, Python, SQL… or Auto, which guesses). The fence keeps the language (```` ```ts ````).
- **Web addresses** written on their own read as the site's icon and the page's title, in the line; the cursor on one brings the address back to edit it. A link with its own words (`[text](https://…)`) shows those.
- **Hover cards.** Pointing at a link shows a card: another page's title and opening lines, or a site's icon, title and description. The whole card opens it (a site in a new tab).
- **Where the keys go:** a bar in the left margin marks the block the cursor is in.
- Backspace at the start of the line after a table, code block or video selects that block, so a second Backspace removes it.

## Video notes

A YouTube address alone on its line becomes an embedded video built for taking notes.

- **Note at 01:25** under the video (or **N** with the focus on the video or the page, not in the text) pauses it and opens a small popup with the time; Enter puts `- [01:25] the line` in the list right below the video, in time order, and the video goes on (it stays paused if it was). An empty Enter adds nothing; Esc cancels. In fullscreen the note is a card in the middle of the screen.
- **Times.** `[01:25]` (or `[1:02:15]`) anywhere in the text is a chip; a press plays the video above it from there. Shift-press, or ⇧⌘↵, plays it in fullscreen. ⌘↵ (Ctrl+Enter) on a line plays its time — or opens its link — and a tag in the margin shows it. A time belongs to the nearest video above it.
- **Floating.** Scrolled away while playing, the video floats small in a corner, over the text; drag its bar to another corner (remembered). Its bar has Note, Back to the video and Close.
- **Fullscreen** (the button under the video) shows the video large, with its notes in a column beside it, in time order; each plays from its time, and the note for what is playing is marked (also in the page). The column can be hidden.
- **Keys on the video,** with the focus on its block (after fullscreen, a note, or a time picked from the list): Space or K play and pause, ← → skip 5 s, F fullscreen, N a note. A click inside YouTube's own player leaves the focus there, so its menus (settings, captions, volume) work; the focus comes back once they are done.
- If YouTube can't load (offline, blocked), the block says so and offers Retry.
- Stored as plain markdown: the video's watch URL on its line, the notes as a list of `[mm:ss]` lines.

## Keyboard shortcuts

| Where | Keys | Does |
| --- | --- | --- |
| Map | ⌘K / Ctrl K | Search the path's pages |
| Map | Tab, then ← → ↑ ↓, Home | Move through the map's pages |
| Map | Enter / Space | Open the page |
| Drawer | Esc | Close a popup, shrink the expanded drawer, or close it |
| Text | `[[` | Pick or create a page to link |
| Text | `/` | Commands |
| Text | ⌘K / Ctrl K | With text selected, make it a link; otherwise search |
| Title | Enter | On to the text |
| Text | ⌘↵ / Ctrl+Enter | Play the time on the line, or open its link |
| Text | ⇧⌘↵ / Shift+Ctrl+Enter | Play the time on the line in fullscreen |
| Video | N | Pause and write a note |
| Video | Space or K · ← → · F | Play/pause · skip 5 s · fullscreen |

## Accessibility and themes

- Light and dark themes; text and controls meet WCAG AA contrast in both (code colours included).
- Everything is reachable from the keyboard; the map is a tree, dialogs and the drawer are named, controls (time chips, the video, close buttons) are announced with what they do.
- Phones: paths open as a list, no horizontal scrolling, shortcut hints only where there is a keyboard.

## Known limits

- Search covers one path at a time.
- N doesn't work while typing in the text (it would type an n) or with the focus inside YouTube's player.
- Fullscreen is the app's own (with the notes); YouTube's fullscreen button is off.
- The floating video snaps to the corners; it can't be resized.
