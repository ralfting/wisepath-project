# A. Current state

Checked in the code on 2026-10-18 (read-only; `web typecheck` clean, `domain` tests 89/89). Docs were used as
context and confirmed against the code. Status: **Done**, **Partial**, **Missing**, **Unverified**.

## Personal notebook

| Capability | Status | Evidence |
|---|---|---|
| Paths, pages, `[[Title]]` links, pages not made yet, branch from the map | Done | `packages/domain/src/paths/tree.ts:54-113`, `apps/web/features/paths/map/ghosts.ts`, `commands.ts:115` |
| Mind map and list views, orphans, modules | Done | `features/paths/map/MindMap/`, `MapList/`, `MapOrphans/` |
| Markdown editor, YouTube embeds, `[mm:ss]` video notes, link previews | Done | `features/paths/editor/`, `editor/video/timestamps.ts`, `apps/api/src/links/` |
| Study vs Learning path, studied marks per learner | Done | `schema.ts:200-219` (`page_progress`), `apps/api/test/progress.test.ts` |
| "Continue studying" | Partial | Learning paths only; goes to the first unstudied page in map order, not to where the learner stopped (`tree.ts:142`, `commands.ts:163`) |
| Resume where I stopped (last page opened, recent activity) | Missing | Recent pages live only in the empty ⌘P palette, in `localStorage`, one key for every account on the device (`useCases/search/recent.ts:22-24`) |
| Inbox, quick capture, ⌘P search, help panel, en/pt-BR, first visit and sample path | Done | `apps/api/src/inbox/`, `features/search/`, `features/help/`, `i18n/messages/{en,pt-BR}/`, `FirstVisit.tsx` |
| Sharing to read/edit, pending invites, public link, take a public path, leave, notices | Done | `packages/contract/src/PathsApi.ts:93-150`, `apps/api/src/paths/application/sharing.ts`, `access.ts:77-101` |
| Export (Markdown, zip, JSON) | Missing | No endpoint in `packages/contract/src`, no download in the web app. Content is already markdown (`schema.ts:103`) |
| Import | Missing | Only the built-in sample (`apps/api/src/paths/application/sample.ts`) |
| Password reset | Missing | The app sends no email (`PathsApi.ts:100`); a forgotten password locks the notes away |
| Account deletion, data download | Missing | `AuthApi.ts:22-44` has no delete; the account menu offers language and logout |
| Undo, trash, page history | Missing | Hard deletes (`apps/api/src/paths/application/paths.ts:77-91,130`); an editor can delete the owner's pages |
| Session length | Partial | 24 h, no refresh (`apps/api/src/auth/infrastructure/session.ts:22,46`): after any pause the learner logs in again |
| Keyboard | Done | Shortcuts in `docs/FEATURES.md`; `MindMap/useMindKeys.ts` |
| Phones | Partial / Unverified | List view below 640px (`PathMap/useMapView.ts:24-26`); not checked on a device |
| Accessibility checks | Missing | No axe in `apps/web/e2e`, though `docs/plans/README.md` requires it |

### Defects found on the way

- The page-delete dialog said links "stay in other pages and show as missing", but deleting turns them into plain
  text on purpose (`useCases/paths/path.ts:140-149`, `docs/FEATURES.md:59`). Fixed 2026-10-18: the copy now says so.
- Spaced review was removed from the app on 2026-10-16, but `ReviewModule` and its table still run
  (`apps/api/src/app.module.ts:10,26`), and `docs/FEATURES.md:131` still lists Review.
- Recent pages in ⌘P were shared across accounts on one browser: a privacy leak on shared computers. Fixed 2026-10-18: one list per account.

## Public side

| Capability | Status | Evidence |
|---|---|---|
| Public read without login | Partial | One route, `/public/paths/[pathId]` (`app/public/paths/[pathId]/page.tsx`); middleware skips it (`middleware.ts:37`) |
| A URL per page | Missing | The open page is React state (`features/paths/public/PublicPath/usePublicPath.ts:18,40`); only the root has a URL |
| Readable URLs | Missing | Client-made UUIDs (`useCases/paths/programs.ts:14`), no slug |
| Body text in the server HTML | Missing | Tiptap with `immediatelyRender: false` (`useMarkdownEditor.ts:59`): page text appears only after hydration |
| `[[links]]` as real links | Missing | Rendered as `<span class="wikilink" role="link">` (`editor/wikiLink.ts:45`), opened by a JS click handler |
| Metadata | Partial | Title only, plus `robots: { index: false, follow: false }` on purpose (`page.tsx:11-17`, asserted in `e2e/sharing.spec.ts:107`). No description, Open Graph, canonical, `metadataBase`, JSON-LD |
| `sitemap.ts`, `robots.ts` | Missing | `apps/web/public/` holds only help videos |
| Catalog, browse, tags, author pages, public search | Missing | Search requires login and covers the reader's own paths (`search.controller.ts:20`) |
| "What it teaches, for whom" | Partial | One optional `description` line (`Path.ts:83-84`); no audience, level, language or topic |
| Visibility model | Done, two states | `private \| public`, whole path only (`packages/domain/src/paths/access.ts:13`). No "listed" state, no private page inside a public path |
| Privacy of the public response | Done | No owner id, name, email, members or progress (`DrizzlePathStore.ts:36-55,84-95`); private and missing answer the same 404 |
| Take the path after signup | Partial | `?next=` brings the visitor back (`shared/routes.ts:37-48`), but they must press Study again |
| Link previews for visitors | Missing | `LinksApi` needs a session (`links.controller.ts:17`): anonymous readers see a bare hostname |
| Caching | Missing | The root layout reads `cookies()` and `headers()` (`app/layout.tsx:30-32`), so every route renders per request; no `revalidate` anywhere; the API cold-starts (`docs/DEPLOY.md:69-70`) |

## Operations

| Item | Status | Evidence |
|---|---|---|
| CI | Done | `.github/workflows/ci.yml`: typecheck, lint, unit and API tests on Postgres; deploy on push to main |
| End-to-end tests in CI | Missing | 15 Playwright tests exist (`learner`, `sharing`, `video`), but CI does not run `test:e2e` |
| Hosting | Done, free | Two Vercel Hobby projects and Neon free (`docs/DEPLOY.md`). **Hobby is "non-commercial personal use only"; Vercel's own examples of commercial use include ads, payments and affiliate-first sites. Donations are explicitly allowed** ([fair use](https://vercel.com/docs/limits/fair-use-guidelines)) |
| Analytics, error tracking | Missing | No Vercel Analytics, Plausible, PostHog or Sentry; Effect spans have no exporter |
| Backups | Unverified | Nothing in the repo; only Neon's built-in history |
| Terms of use, privacy policy | Missing | No pages or messages for either |
| Domain | Unverified | `docs/DEPLOY.md` names no custom domain |

## What could not be verified

- Behaviour on real phones and with screen readers.
- What a crawler actually receives: the analysis of the server HTML is from the code, not from a fetched page.
- Neon backup retention on the current plan.
- Any traffic or usage numbers: there are none (`PRODUCT.md`, "Evidence on Hand").

## Keep as it is

The authoring loop (write, link, open the link to create), the map as a reading of links, per-learner progress,
sharing without copies, the access rule in one place (`accessOf`), the 404 that hides private paths, i18n,
the keyboard model and the test discipline. None of the vision needs them changed; the catalog is built on top.
