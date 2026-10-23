# WisePath features

What the app does today, as a learner meets it. The product's intent and principles are in [PRODUCT.md](../PRODUCT.md); how the code is laid out is in the [README](../README.md).

Markdown is the source of truth throughout: everything below is either stored as plain markdown in a page (links, times, videos, code) or is a way of showing that markdown. Nothing is kept beside it.

## Paths

A **path** is one subject being learned. Its centre page carries the subject's name; every other page hangs off it through `[[links]]`.

- **Two kinds.** A **Study** is open notes organised as a map: no progress, nothing to finish. A **Learning path** is followed page by page, with "I've studied this" on each page, a progress ring, and "Start / Continue studying" opening the next page in map order. The root is the first page of that order: starting a path opens it, and it counts in the progress like any page. New paths start as Studies: with one page there is nothing to follow yet, so the New path dialog asks only the name and the project.
- **Switching kind** from the path's ⋯ menu (on its home card, or beside its title on the map) keeps the studied marks: a Study hides them, a Learning path shows them again.
- **Projects** group paths. Every path is in one. Each account has a default project (General, or Geral in Portuguese) with a Default badge: it can be renamed but not deleted. **New project** beside New path; a project's ⋯ menu renames or deletes it, and a deleted project's paths move to the default one.
- **First visit.** With no path yet, My paths shows **Start here**: three lines on how WisePath works, **New path**, and **Try a sample path**, which copies a sample learning path about literature (in the account's language, titled as a sample) into the default project and opens it. The card goes with the first path.
- **Home (My paths):** one group per project, the default first and the rest by name; an empty project still shows. With a single project the cards show without its header. A project's name (with its arrow) **folds** its cards away and unfolds them; the choice is remembered on this device, and a search shows what it found in folded projects too. One card per path. A Learning path shows its progress bar, the next page and the Continue button; a Study shows its size ("57 pages · 10 modules"). Searchable by title or description, hiding the projects with nothing matching. **Drag a card** onto another project's group to move it there, or use **Move to** in the card's menu: it shows there at once, goes back if the move can't be saved, and a toast offers Undo. Delete from the same menu.
- **Download as Markdown** in a path card's menu (its owner only) saves `<Path>.zip`: one `.md` file per page, named after its title, with the text as written, `[[links]]` included, so it opens in Obsidian or any editor. **Download my paths** in the account menu saves every path you own, one folder each. Paths from others are never downloaded: they stay their owner's.
- **Delete account** in the account menu asks for your password and offers **Download my paths** first. It deletes every path you own (people studying them see that it was deleted), your projects, your Inbox and your progress on paths from others; paths others own stay theirs.
- **Catalog** in the Share dialog (owner only): **Ask to publish** sends what the path teaches, who it is for and its language for review; the section then says **Waiting for review** (with **Withdraw**), **Not accepted for the catalog** (with **Ask again**) or **In the catalog** (with **Unpublish**, which leaves it readable by its link for whoever took it). The path keeps its link setting while the request waits; making it private drops the request. Published paths are still `noindex` until the pages for search engines exist.
- **The catalog** (`/explore`, linked from the home page and from every published path's header) lists every published path as a card: its title, what it teaches, who it is for, its language and how many pages it has; the whole card opens it. **Search** finds paths by every word typed in their title, what they teach or who they are for, ignoring case and accents; a language filter keeps the paths in one language, and keeps the search. Results come 24 to a page, with Previous and Next. A search lives in the address (`/explore?q=testes&lang=pt-BR`), so it can be shared; its results are not indexed, the catalog is. It reads without an account or JavaScript, and the sitemap lists it once the site has its own domain. Paths readable only by their link are never in it.
- **A published path in the catalog** reads at `/p/<path>` and `/p/<path>/<page>`, addresses made from the titles (given when it is first published and kept after). Each page is rendered on the server and works without JavaScript: the path's title, what it teaches and who it is for, the page's trail, its text with `[[links]]` as links to the other pages (a title with no page stays text), the related pages and the path's pages in map order, **Previous** and **Next** in reading order, and **Study this path**. Its old public link leads there, and the Share dialog copies this address. Search engines are let in once the site has a domain of its own (`SITE_URL`): then the pages are indexable with their canonical address and Open Graph, `robots.txt` points at a sitemap of every published page, and the areas behind a login stay out. Until then everything is `noindex` and `robots.txt` closes the site.
- **Requests to publish** (`/admin/publications`), for the accounts in the API's `ADMIN_EMAILS` only: each request with what is needed to decide and a link to read the path, and **Approve** or **Decline**. Anyone else gets not found.
- **New path** opens with the default project chosen (a folder icon marks the project field); a project's **+** opens it with that project. Either can be changed in the dialog.
- **Sharing** (the owner's **Share** button beside the map's title): add people by email, who **Can read** or **Can edit**; change or remove them in the same dialog. An email with no account yet waits in the list ("Waiting for them to sign up with this email") and becomes theirs when someone signs up with it; WisePath sends no email, the owner tells them. It can be cancelled while it waits. A path can also be **public**: anyone with its link reads it at `/public/paths/…`, logged in or not, and it is never listed or indexed by search engines. A **Share** button beside **Study this path** opens the phone's share sheet, or copies the link elsewhere. On a wide screen the public page opens on the path's map, and a page chosen in it is read in a drawer beside, the map left usable (another page clicked takes its place; Esc or the close button shuts it); the wheel scrolls the page, and Ctrl/⌘ + wheel zooms the map. **Map** and **List** switch to the list of pages beside the page chosen, never both at once. Each page ends with **Previous** and **Next** in reading order; a phone shows no map: the page comes first and the list of pages follows it, and a page opened from that list or from Next is read from its top. Making it private again takes it away from everyone but its owner and the people added.
- **Told when a path is gone.** Someone who loses a path without choosing to (it was made private after they took it, its owner stopped sharing it with them, or deleted it) sees a notice once, the next time they open the app. Leaving a path yourself says nothing.
- **Progress is each learner's own**, on their paths and on anyone else's: studied marks, the progress bar and Continue follow the person reading, and nobody sees another's, the owner included.
- **Reading and editing someone else's path.** A reader sees the map and pages without the editor (no +, no N, no menus, no toolbar) and still marks pages studied. An editor edits pages like the owner, but only the owner renames the path, changes its kind or its look's description, shares it, moves it or deletes it.
- **From others** on My paths, after the projects: the paths shared with you and the public ones you took, each with its owner's name. Their menu has **Leave** only, which takes your marks on it too.
- **Study this path** on a public path's page adds it to your paths, to study with your own progress. It is never a copy: the content stays the owner's and follows their edits, and it goes away if they make it private or delete it.
- **Sidebar:** every path, with its progress for Learning paths. Collapses to an icon rail that floats open on hover; on the rail a Learning path's icon has a thin progress ring.

## Help

- **Help** in the sidebar (the ? on the collapsed rail) opens **What can I do here**, for the screen you are on: its topics as a list where one opens at a time.
- **On a page:** Add a page; Take notes on a video; Put a note in a coloured box; Move a page to another branch (these two without a clip yet). **On a map:** Add a page from the map; Find a page in this path; Open a page; Move with the keyboard. **On the Inbox:** Capture an idea; Add it to a page; Make it a page; Bring it in from a page; Use the keyboard. **On My paths:** Start a path; Group paths in projects; Study or learning path.
- Most topics play a short looping clip of the app doing it, with a numbered caption for each step, in the app's language (English or Portuguese); with reduced motion the clip waits for Play. A press on a clip (or its corner button) shows it large, with the player's controls; Esc closes the large clip, then Help, then the page.
- The clips are recorded from the real app (headless Chrome, demo account, a path on Rust), captioned and rendered with HyperFrames (`videos/help-*`, kept out of git), and served from `apps/web/public/help/`.

## Search everywhere

- **⌘P (Ctrl P)** anywhere in the app — the home, a map, a page, even while writing — opens a search palette in the middle of the screen. So does **Search pages** in the sidebar (a magnifier on the rail).
- **Empty,** it lists the pages opened most recently, across paths (kept in this browser, one list per account).
- **Typing** searches every path, ignoring case and accents ("revisao" finds "Revisão"), for pages whose title or text holds every word: exact titles first, then titles that start with it, titles with all the words, then text matches; the most recently edited first within each. Each result says where it sits ("NestJS › Providers") and, for a text match, shows the line around it with the words marked.
- **↑ ↓** move, **Enter** opens the page on its path's map, in the drawer, **⌘Enter** (Ctrl+Enter) as a full page, **Esc** closes the palette (a drawer behind it stays open).

## The map

The map is a reading of the links, never stored on its own.

- **Opening a path** that takes more than half a second shows a small reader turning the pages of a book ("Opening the path…"); a quicker one shows nothing, and with reduced motion the reader stays still.

- **Layout.** A horizontal mind map: the centre page in the middle, its branches split left and right, each level a column further out. The first link that reaches a page makes it a branch of the linking page; any other link is drawn as a faint arrow, which brightens for the open page or the one under the pointer. Pages no link reaches are **unlinked pages** (orphans, in the code), listed apart.
- **Pages named but not made.** A `[[link]]` to a page that doesn't exist yet shows at once as a ghost page, dashed and faint, after the real pages branching from the same page, on the map and in the list. Opening it (click or Enter) makes the page and opens it. Someone who may only read the path sees none.
- **Modules.** Any page can be shown as a module: drawn larger, with a colour and an icon (set on the page's icon). Pages below a module take its colour.
- **List view.** The same tree as an indented list. On a phone it is the only view: the map needs more room than a phone has, so the Map/List switch is not shown.
- **Search (⌘K / Ctrl K).** Lists the pages that match, each with where it sits ("In Providers"); the map highlights them and follows the one marked with the arrows; Enter opens it. A click outside folds the search and keeps its filter.
- **Add a page from the map.** Pointing at a page (or focusing it, or opening it) shows a **+** on its outer edge; the + or **N** on the focused page zooms in on it and opens a name field below it. Enter adds the page as a branch of it (a `[[Name]]` line at the end of its text) and opens it in the drawer, the cursor in its text, like /Page; Cmd/Ctrl+Enter adds it and stays, the field emptied for the next; Esc closes the field. A name another page has links that page instead. Enter with no name yet adds an untitled page ("Untitled page", then "Untitled page (2)"…), which opens like any page, with the cursor in its text; renaming it later moves the link. Undo stays offered for a few seconds. In the list, each row has the same + (and N), and **New page** at the end adds one to the path's main page.
- **Keyboard.** The map is one Tab stop, then a tree: → and ← follow the branches as drawn (out and back in), ↑ and ↓ move between siblings, Home goes to the centre, Enter or Space opens a page.
- **Zoom** opens at a size titles can be read at; − / + / fit to screen / centre on the root are in the corner, with a legend.

## Pages

- **Drawer.** A page opens in a drawer beside the map; its URL is the page's own, so Back closes it and a reload opens the full page. Another page (from the map, search or Related) replaces it at once. Expand grows it into the full page in place. Esc closes it (a menu or popup open in it closes first); the focus goes back to the page on the map.
- **Opened from the map,** by a click or the keyboard, the cursor is at the start of the page's text. A page just made opens with the cursor at the end of its text, and one reached from another page in the drawer puts the cursor back where it was. Tab past the drawer's end goes back to the map.
- **Where a page opens.** From the map or the drawer, another page opens in the drawer; from a full page, as a full page, in place (Back returns). **⌘-click** (Ctrl-click) on a page on the map or a `[[link]]` opens it the other way: as a full page from the map or the drawer, in the drawer over the map from a full page.
- **Related tab:** where the page branches from, its branches, the pages it links to and those linking to it. Pointing at one rings it on the map and singles out its link.
- **Move a page to another branch.** **Change** beside "Branches from" (**Choose** on an unlinked page) opens a searchable list of the pages it can branch from, indented as on the map. Picking one moves the page's `[[link]]`: a line holding only the link leaves the page it branched from (a link inside a sentence stays as its words), and a `[[link]]` line is added at the end of the new one. Only pages where the move holds are listed: not the page's own branches, nor pages reached after another page that also links to it. Hidden on a path the learner only reads.
- **Title.** Edited in place; links to the page follow the new name when editing ends, and the page never shows as unlinked meanwhile. A title another page has is refused (links would be ambiguous). Enter moves on to the text.
- **Outline.** With two headings or more, a rail of dashes on the right edge; hovering it lists the headings ("On this page"), and it works from the keyboard.
- **Previous and Next** at the end of every page lead to the pages before and after it in the map's reading order, the one Continue studying follows: down into the page's first branch, else on to the next branch beside it, else back up to the next branch beside the page above. An unlinked page has neither.
- **Delete** from the page's ⋯ menu: links to it become plain text, and pages only it reached end up unlinked, off the map.

## Writing

The editor shows formatting as you type and saves markdown. The **?** in its toolbar lists the markdown it understands.

- **`[[Page]]`** links another page of the path (shown with a book icon); a name that doesn't exist yet is shown dashed and offers to create the page. Typing `[[` opens a picker of pages; a new name there creates it.
- **`/` commands:** headings, lists, checklists, code, quote, table, video, info, warning and danger callouts, Page, which asks for a name, links it and goes to it (Cmd/Ctrl+Enter stays here; with no name, an untitled page, as from the map), and Inbox item, which searches what waits in the Inbox (↑ ↓, Enter) and puts the chosen item where / was typed; it leaves the Inbox once the page is saved.
- **Tables:** a markdown header row (`| A | B |`) then Enter makes a table with a row to fill; pasted markdown tables work too.
- **Callouts:** a note in a coloured box, info (blue), warning (yellow) or danger (red). `[!info]`, `[!warning]` or `[!danger]` and a space at the start of a line makes one, as do /info, /warning and /danger; Enter on an empty line inside leaves it. Its icon is a menu that changes the kind or removes the box, keeping the text. Saved as an Obsidian callout (`> [!warning]` on the quote's first line), so pasted Obsidian callouts of those kinds work, and the catalog shows them the same; a quote with another marker (GitHub's `[!NOTE]`) stays a quote.
- **Code blocks** have syntax colours, and the language in their top corner: a searchable picker (TypeScript, Python, SQL… or Auto, which guesses). The fence keeps the language (```` ```ts ````).
- **Web addresses** written on their own read as the site's icon and the page's title, in the line; the cursor on one brings the address back to edit it. A link with its own words (`[text](https://…)`) shows those.
- **Hover cards.** Pointing at a link shows a card: another page's title and opening lines, or a site's icon, title and description. The whole card opens it (a site in a new tab); a site's card also shows that ⌘-click (Ctrl-click) on the link opens it in a new tab. A link written without http, like `www.google.com`, opens that site with https.
- **Where the keys go:** a bar in the left margin marks the block the cursor is in.
- Backspace at the start of the line after a table, code block or video selects that block, so a second Backspace removes it.

## Video notes

A YouTube address alone on its line becomes an embedded video built for taking notes.

- **Note at 01:25** under the video (or **N** with the focus on the video or the page, not in the text) pauses it and opens a small popup with the time (while the video plays, 5 s back, where what caught the ear began; paused, exactly where it is); Enter puts `- [01:25] the line` in the list right below the video, in time order, and the video goes on (it stays paused if it was). An empty Enter adds nothing; Esc cancels. In fullscreen the note is a card in the middle of the screen, and Esc cancels it without leaving fullscreen (Chrome, Edge and other Chromium browsers; Safari and Firefox always leave on Esc).
- **Times.** `[01:25]` (or `[1:02:15]`) anywhere in the text is a chip; a press plays the video above it from there, and when the video is out of view the page scrolls to it. Shift-press, or ⇧⌘↵, plays it in fullscreen. ⌘↵ (Ctrl+Enter) on a line plays its time — or opens its link — and a tag in the margin shows it. A time belongs to the nearest video above it.
- **Floating.** Scrolled away while playing, the video floats small in a corner, over the text; drag its bar to another corner (remembered). Its bar has Note, Back to the video and Close.
- **Fullscreen** (the button under the video) shows the video large, with its notes in a column beside it, in time order; each plays from its time, and the note for what is playing is marked (also in the page). The column can be hidden.
- **Keys on the video,** with the focus on its block (after fullscreen, a note, or a time picked from the list): Space or K play and pause, ← → skip 5 s, F fullscreen (Esc, or holding it, leaves), N a note. A click inside YouTube's own player leaves the focus there, so its menus (settings, captions, volume) work; the focus comes back once they are done.
- If YouTube can't load (offline, blocked), the block says so and offers Retry.
- Stored as plain markdown: the video's watch URL on its line, the notes as a list of `[mm:ss]` lines.

## Inbox and quick capture

Write it down now, sort it later: capturing never asks where something goes.

- **Quick capture (⌘⇧Space / Ctrl+Shift+Space),** anywhere in the app, even while typing in a page, opens a small box in the middle of the screen with one field. Enter saves to the Inbox and closes; Shift+Enter starts a new line; Esc closes without saving. The Capture button on the Inbox opens it too. On a phone, with no Shift+Enter, Enter starts a new line and a Save button saves.
- **A pasted address** is kept with its title (from the link preview), shown under the field; a YouTube address with a time (`?t=85`, `t=1m25s`) keeps that moment. The address is dropped if it is taken out of the text, or with the ✕ beside it.
- **Over a page** (in the drawer or full), the box also offers **Add to "this page"**: chosen there, or with ⌘Enter / Ctrl+Enter, the text goes straight to the end of that page instead of the Inbox.
- **From a page, `/` Inbox item** brings something waiting in the Inbox into the text where the cursor is: a note as written, a link, or a video moment as its `- [01:25]` note (after the video, when the page doesn't have it yet).
- **The Inbox** is one per learner, not per path: a page in the sidebar above the paths, with how many items are waiting (a dot on the rail). Each item shows its text, where it came from (the site's icon and name, linked, and the video's moment; or "Written in WisePath") and when it came in, newest first.
- **Add to…** picks a path, then one of its pages, each a searchable list (the path last opened first); the item is added to the end of that page and leaves the Inbox once the page is saved. A video moment goes into the notes right below that video, in time order, as `- [01:25] text`; when the page doesn't have the video, the video is added at the end with the note below it.
- **Make it a page** picks a path and the page to link it from: a new page titled from the item (its link's title or first line) holds it, and a `[[link]]` to it is added at the end of the chosen page.
- **Delete** takes it out at once, with Undo for a few seconds.
- **From the keyboard:** ↑ ↓ move between items, A adds to a page, D deletes, Enter opens where it came from. In the pickers ↑ ↓ choose, → (or Enter) opens the marked path's pages, Enter picks a page, ← at the start of the search (or Backspace in an empty one) goes back to the paths, with the path just left still marked.
- Stored as plain markdown once added to a page: text as written, an address as a `[title](address)` link on its line (a YouTube address alone, which shows as the video), a moment as a `[mm:ss]` note.

## Keyboard shortcuts

| Where | Keys | Does |
| --- | --- | --- |
| Anywhere | ⌘P / Ctrl P | Search every path |
| Search | ↑ ↓ · Enter · ⌘↵ / Ctrl+Enter · Esc | Move · open on the map · open as a full page · close |
| Map | ⌘K / Ctrl K | Search the path's pages |
| Map | Tab, then ← → ↑ ↓, Home | Move through the map's pages |
| Map | Enter / Space | Open the page |
| Map, text | ⌘-click / Ctrl-click a page or a `[[link]]` | Open it the other way: as a full page, or in the drawer from a full page |
| Map, list | N | Add a page branching from the focused one |
| Drawer | Esc | Close a popup, shrink the expanded drawer, or close it |
| Text | `[[` | Pick or create a page to link |
| Text | `/` | Commands |
| Text | ⌘K / Ctrl K | With text selected, make it a link; otherwise search |
| Title | Enter | On to the text |
| Text | ⌘↵ / Ctrl+Enter | Play the time on the line, or open its link |
| Text | ⇧⌘↵ / Shift+Ctrl+Enter | Play the time on the line in fullscreen |
| Video | N | Pause and write a note |
| Video | Space or K · ← → · F | Play/pause · skip 5 s · fullscreen |
| Anywhere | ⌘⇧Space / Ctrl+Shift+Space | Quick capture to the Inbox |
| Capture box | Enter · Shift+Enter · ⌘Enter / Ctrl+Enter · Esc | Save · new line · add to the open page · close |
| Inbox | ↑ ↓ · A · D · Enter | Move · add to a page · delete · open the source |

## Accessibility and themes

- Light and dark themes: **Appearance** in the account menu picks **Light**, **Dark** or **System** (the device's setting). The choice is kept on this device, not on the account; until you pick one, WisePath is light.
- Text meets WCAG AA contrast in both themes (code colours and callouts included): `e2e/contrast.spec.ts` checks every main screen with axe in light and dark, and saves a screenshot of each under `apps/web/test-results/contrast/`.
- Everything is reachable from the keyboard; the map is a tree, dialogs and the drawer are named, controls (time chips, the video, close buttons) are announced with what they do.
- Phones: paths open as a list, no horizontal scrolling, shortcut hints only where there is a keyboard.

## Known limits

- Review covers your own paths only; search everywhere covers those from others too (shared with you or taken), not public paths you only opened.

- No capturing from other sites yet: a browser extension is planned for later ([plan 8](plans/08-browser-extension.md)).
- Search everywhere looks at titles and text only: not inside videos, and without filters (by path, by kind) or operators.
- N doesn't work while typing in the text (it would type an n) or with the focus inside YouTube's player.
- Fullscreen is the app's own (with the notes); YouTube's fullscreen button is off.
- The floating video snaps to the corners; it can't be resized.
