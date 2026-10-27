# 23. Citing a page, apart from linking it

Decided 2026-10-27 with the owner. Built in this plan.

## Why

A page reaches another in one way today: `[[Title]]`. The first link that reaches a page, read outward from the
root, makes it a branch of the linking page; every other link is a faint blue arrow. So the author does not choose
the hierarchy, the reading order does: "as we saw in [[Market]]" written in the root before the page that should
hold Market makes Market a branch of the root. The only fix today is moving the `[[link]]` with Change beside
"Branches from".

A mention is often a reference, not the next step. The author should be able to say which: a **link** is the path
onward and shapes the map; a **citation** points at a page without placing it.

## The experience

- **Writing one.** `@[[Title]]` in the markdown. In the editor the `@` never shows: a citation is the same chip as a
  link, quieter (dimmed text, a dotted underline, a small quote icon before it). The chip's menu (and ⌘⇧L /
  Ctrl+Shift+L with the cursor on it) turns a link into a citation and back; `/cite` (pt-BR `/citar`) picks a page
  to cite, as `/link` picks one to link. Typing `@[[` opens the same page picker as `[[`.
- **On the map.** Only links make branches and decide where a page sits. A citation never does: it draws as a thin
  dashed grey line between the two pages, no arrowhead, fainter than the link arrows, and like them it brightens
  when either page is pointed at or open. Three weights, so the eye reads the path first: the branch (strong, in the
  module's colour), another link (the blue arrow, as today), a citation (dashed grey). The legend names all three.
- **A page only cited** has no place on the map: it is listed with the unlinked pages, saying which pages cite it,
  and it counts toward no progress (decided 2026-10-27: only links make the map; citations cross it).
- **Progress and Continue studying** follow branches only, as today; citations change nothing there.
- **Related tab.** Besides where it branches from, its branches, links to and linked from: **Cites** and **Cited
  by**, each page once, under its strongest relation (a page both linked and cited shows as linked).
- **Elsewhere.** Renaming a page renames its citations; deleting it turns them into plain text, `@` included. Search
  reads a citation as its title. The Markdown download keeps `@[[Title]]` (Obsidian shows "@" then the link). The
  catalog and the public link draw a citation as a quieter link to the page, as the editor does.
- A citation of a title no page has is shown as missing, as a link is, and clicking it offers to create the page; the
  page made that way is unlinked until something links it. It adds no "not made yet" page to the map.

## How it works

- **Domain** (`packages/domain/src/paths/links.ts`): one parser for both kinds. `references(markdown)` → ordered
  `{ title, kind: "link" | "citation" }[]` outside code, an `@` right before `[[` making it a citation.
  `connectionsOf(path, pageId)` → `{ to, kind }[]`, each target once, a link winning over a citation of the same
  page. `linksOf` keeps its meaning (links only), so `mapTree`, branches, `addBranch` and the pending titles read
  links as before; `citationsOf` gives the rest. `mapTree` adds `citations: Arrow[]` beside `arrows`, minus pairs
  already joined by a branch or an arrow. `relatedPages` adds the two relations. The unlinked list gets the pages
  citing each. `renameLinks` / `unlinkPages` (`rules.ts`) handle the `@`.
- **Web**: the `WikiLink` node gets a `citation` attribute, parsed from `@[[` and written back as `@[[title]]`; its
  input rule, chip menu, shortcut and slash command; `MindLines` draws `tree.citations`; the legend, Related tab and
  unlinked list read the domain; the catalog's `remarkWikiLinks` reads the `@`.
- No API, contract or database change: citations live in the page's markdown like links.

## Checks

- Domain: the parser with `@[[`, code, an `@` elsewhere in the line, a link and a citation of the same page; `mapTree`
  never places a page through a citation, and a page only cited is unlinked; related pages; rename and delete keep or
  drop the `@`.
- Web: the chip toggles and saves `@[[`; the map draws the three weights in light and dark, with the legend;
  Related shows Cites and Cited by; both languages; axe clean.
