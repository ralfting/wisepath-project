# 20. Published paths as pages a search engine can read

Decided 2026-10-18 ([strategy](../strategy/06-execution-and-metrics.md), stage 4; backlog P1.2; decision G8: the
markdown renders with `react-markdown` and `remark-gfm`). Built in this plan. The sitemap, `robots.ts`, indexing and
canonical URLs come with a domain of our own (stage 5): until then every page here stays `noindex`.

## Why

A public path today shows its text only after JavaScript runs (Tiptap, `immediatelyRender: false`), has one URL for
all its pages, and links its pages through click handlers on `<span>`s. A crawler sees a title and an empty box.
Published paths need pages that answer with their text, one URL each, and real links between them.

## The experience

- A published path lives at `/p/<path>`, its root page, and `/p/<path>/<page>` for each page: readable addresses
  made from the titles (`/p/testes-em-react/user-event`).
- Each page shows the path's title, what it teaches and who it is for, where the page sits (its trail from the root),
  the text, then the pages related to it, and the path's pages in map order: all of them links.
- `[[links]]` in the text are links to those pages; a title with no page yet stays plain text. Web addresses open
  in a new tab; a YouTube address on its own line is a link to the video.
- **Study this path** works as on the public link page (logged in: take it; a visitor: sign up or log in, then back).
- The text is in the HTML the server sends, and the page works with JavaScript off. The content carries the path's
  language (`lang`).
- A published path opened by its old link (`/public/paths/<id>`) is sent to its catalog address.

## How it works

- **Domain** (`packages/domain/src/paths/slugs.ts`): `slugOf(title)` (lower case, accents dropped, words joined by
  `-`), `pageSlugs(path)` (each page's slug, unique within the path by order: a second `hooks` is `hooks-2`; the root
  has none). `Path.slug` (optional): the path's address once published.
- **Database**: `paths.slug` (nullable, unique). Given on approval from the title, with `-2`, `-3` when taken, and
  kept after: renaming the path does not move its address.
- **API**: `GET /public/published/:slug`, no session: the published path with that slug, as a visitor reads it;
  `PathNotFound` otherwise. The public link read keeps answering by id.
- **Web**:
  - `app/p/[slug]/[[...page]]/page.tsx`: a Server Component over a `queries.ts` read, `notFound()` for an unknown
    path or page, metadata (title, description), `robots: noindex` for now.
  - `features/paths/catalog/`: `PublishedPage` and its parts, Server Components; `MarkdownText` renders markdown
    with `react-markdown` and `remark-gfm` (no `dangerouslySetInnerHTML`), with `remarkWikiLinks` turning `[[Title]]`
    into links; `StudyButton` is the one client part, from `features/paths/public`.
  - `app/public/paths/[pathId]` redirects a published path to `/p/<slug>`.

## Checks

- Domain: slugs for accents, punctuation, empty titles and repeats.
- API: approving gives the slug, a second path with the same title gets `-2`; the slug read answers a published path
  and not found for a public or private one.
- Web: `remarkWikiLinks` and `MarkdownText` render links, missing pages, external links and tables.
- E2E: a visitor with JavaScript off reads a published page's text and follows a `[[link]]` to the next page; axe
  finds nothing on it.
