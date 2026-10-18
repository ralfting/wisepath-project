# 19. Publish a path to the catalog

Decided 2026-10-18 ([strategy](../strategy/03-product-vision.md), decisions G1 and G2; backlog P1.1). Built in this
plan. The catalog page and the pages search engines read come later (strategy stages 4, 5 and 7).

## Why

A public path today is "anyone with the link": never listed, `noindex`, a promise made to the authors who shared
that way. The catalog needs a state the author asks for on purpose, and that the WisePath owner approves while the
catalog is small.

## The states

| Visibility | Who reads | In the catalog |
|---|---|---|
| `private` | The owner and the people invited | No |
| `public` | Anyone with the link (unchanged) | No |
| `published` | Anyone, without an account | Yes, once the catalog exists |

`published` is set only by an approval. Until then a request waits beside the path, which keeps its visibility.
Every page stays `noindex` in this plan, `published` too: search engines come with the pages built for them (stage 4).

## The experience

- **Share** gains **Catalog**, below the link (owner only):
  - Not asked: **Ask to publish** opens a short form: what the path teaches (its description), who it is for (one
    line), and its language. Sending it says the path is listed on WisePath and shown to search engines once approved.
  - Waiting: "Waiting for review", and **Withdraw**.
  - Declined: "Not accepted for the catalog", and **Ask again** (the same form).
  - Published: "In the catalog", and **Unpublish**, which takes it out of the catalog and leaves it readable by its
    link: learners who took it keep it.
- Making a published path private works as it does today (its takers lose it, with a notice); its request goes too.
- **Publication requests** (`/admin/publications`), for WisePath's administrators only (anyone else gets not found):
  each request with its title, description, audience, language, page count and owner, a link to read it, and
  **Approve** or **Decline**.

## How it works

- **Domain** (`packages/domain/src/paths`):
  - `PathVisibility` adds `published`; `accessOf` reads it as public. `VisibilityEdit` takes `private | public` only.
  - `PathLanguage` (`en | pt-BR`), `Path.audience` and `Path.language` (optional), `Path.publication`
    (`pending | declined`, the owner's view; absent otherwise).
  - `PublicationRequest` (description, audience, language), `PendingPublication` (what an administrator reviews),
    errors `NotAdmin` (404, so the page does not show it exists).
- **Database**: `paths.audience`, `paths.language` (nullable); table `publication_requests` (`path_id` primary key
  -> paths, cascade; `status` `pending | declined`; `requested_at`; `decided_at`).
- **API**:
  - `PUT /paths/:id/publication` (owner): saves description, audience and language; a path not yet published gets a
    pending request. `DELETE /paths/:id/publication` (owner): withdraws the request, or unpublishes to `public`.
  - `GET /admin/publications`, `POST /admin/publications/:id/approve`, `POST /admin/publications/:id/decline`:
    administrators are the accounts whose email is in `ADMIN_EMAILS` (comma separated, read through Effect `Config`).
  - `setVisibility` to `private` drops a request and takes a published path out of the catalog; to `public`, a
    published path leaves the catalog and a waiting request stays.
- **Web**: `CatalogSection` in the Share dialog with its form; `app/admin/publications` reading on the server
  (`queries.ts`) and deciding through Server Actions; messages under `share.catalog` and `admin.`.

## Checks

- Domain: `accessOf` gives a published path to anyone as a viewer; the edit schema refuses `published`.
- API: only the owner asks, withdraws and unpublishes; a request leaves the visibility alone; approving publishes,
  declining keeps the visibility; a non-administrator gets `NotAdmin` on every admin endpoint; unpublishing keeps
  takers; making it private removes them and the request.
- Web: the Share dialog's catalog states on Memory layers; e2e: an owner asks, an administrator approves, the path
  reads as published.
