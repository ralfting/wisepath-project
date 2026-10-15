# 4. Search everywhere

## Why

Search covers one path at a time, and only titles. Once there are several paths, "where did I write about X?" means opening each one. Getting to any page should take a shortcut and a few letters.

## The experience

- **⌘P** (Ctrl+P) anywhere in the app opens a palette in the middle of the screen (the same shell as [plan 1](01-inbox-quick-capture.md)'s capture box).
- Empty, it lists the pages opened most recently, across paths.
- Typing searches every path: page titles first, then pages whose text matches, each with its path, where it sits ("NestJS › Providers") and, for a text match, the line around it with the words marked.
- ↑ ↓ move, Enter opens the page (on its path's map, in the drawer), ⌘Enter opens it as a full page. Esc closes.
- The map's own ⌘K search stays as it is: it filters that map.

## Scope for v1

In: the palette, recent pages, title and text search across paths, keyboard navigation, opening in the drawer or full page.
Out: searching inside videos' transcripts, filters (by path, by kind), search operators.

## Model

- Recent pages: kept in the browser (a short list of page ids and when they were opened), per viewer; no server state.
- Ranking (a pure function, tested): exact title, title prefix, title words, then text matches, newest edited first within each.

## API

- `SearchApiGroup`: `GET /api/search?q=&limit=` over the learner's pages: title and content, case- and accent-insensitive.
- Postgres: `pg_trgm` and `unaccent` with a trigram index on title and on content (a migration). For a personal notebook's size this is fast without a separate search engine.
- Results carry `projectId`, `pageId`, title, the path's title, and a short excerpt around the first match.

## Web

- `useCases/search/`: a debounced query (150 ms) as an atom; recent pages in local storage.
- `features/search/SearchPalette.tsx`, hosted by the palette shell from plan 1; opened by ⌘P in `AppFrame`.
- Opening a result: `mapWithPageHref(projectId, pageId)`, or the page route for a full page.

## Checks

- Domain: ranking order; excerpt cutting around the match.
- API: title vs text matches, accents ("revisao" finds "revisão"), another user's pages invisible, limit.
- Browser: ⌘P from the home, a map and a page; recent pages; type, arrows, Enter opens the right page in another path; axe.

## Open decisions

1. ⌘P (recommended; what editors use) or reuse ⌘K everywhere and keep per-map filtering inside the map's own search box?
2. Search the Inbox's items too (once plan 1 is in), or only pages?
