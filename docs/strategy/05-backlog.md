# E. Prioritised backlog

Rule: nothing enters P0 or P1 without a hypothesis it serves: **acquisition**, **learning**, **retention**, **trust**
or **revenue**. Complexity is relative: S (a day or two), M (a plan with a few commits), L (a plan over several
steps, with a migration). Each item becomes a `docs/plans/NN-*.md` before it is built.

## P0: corrections and essentials

### P0.1 Markdown export (trust)
- **Problem**: no way to take notes out. A learner cannot trust a notebook they cannot leave.
- **Solution**: "Download as Markdown" on a path: a zip with one `.md` per page (title as file name, `[[links]]`
  kept, front matter with the path's title and module look); and one zip of all paths from the account menu.
  Built from the stored markdown, no conversion.
- **Benefit**: trust; it is also the honest answer to "what if WisePath goes away".
- **Complexity**: S-M. **Depends on**: G9 (zip on the API or in the browser).
- **Validate**: unit test on the file layout; e2e downloads a path and finds every page; the files open in Obsidian.

### P0.2 Password reset (trust)
- **Problem**: no email is sent, so a forgotten password loses every note.
- **Solution**: "Forgot password" sends a single-use, short-lived link, from the Nest API over SMTP (`nodemailer`),
  the relay set by configuration: Gmail first, Resend once there is a domain (G5).
- **Complexity**: M. **Depends on**: G5 (decided), a Gmail app password in the API's secrets.
- **Validate**: API tests for token expiry, reuse and unknown email (same answer either way); e2e with a captured email.

### P0.3 Page delete says one thing and does another (trust)
- **Problem**: the dialog promises links "show as missing", the web turns them into plain text, the API does neither.
- **Solution**: choose one behaviour, put it in the domain, use it in both clients, match the copy. Add a bug note.
- **Complexity**: S. **Validate**: a domain test and the dialog copy in en and pt-BR.

### P0.4 Recent pages leak across accounts on one browser (trust)
- **Problem**: `useCases/search/recent.ts` uses one `localStorage` key for every account and logout keeps it.
- **Solution**: key by user id and clear on logout; or replace by the server-side "last opened" of P1.6.
- **Complexity**: S. **Validate**: a unit test with two users.

### P0.5 Terms of use and privacy policy (trust, before anything is indexed)
- **Problem**: publishing user content to search engines, collecting emails and later affiliate links need both,
  under LGPD; none exist.
- **Solution**: two plain pages in en and pt-BR: what is collected, who sees what, content stays the author's,
  licence of published content (G6), how to delete an account, how to report a path.
- **Complexity**: S (writing, mostly). **Depends on**: G6. **Validate**: linked from signup and every public page.

## P1: needed to validate the vision

### P1.1 "Published" as its own state (acquisition, trust)
- **Problem**: public means "by link, never indexed", a promise in `docs/FEATURES.md` and a test. A catalog needs a
  state the author chooses on purpose.
- **Solution**: visibility `private | link | published` (G1). Today's public paths become `link`, unchanged.
  Publishing asks for a summary, the language and the audience line; the Share dialog shows what it means.
  `accessOf` reads both `link` and `published` as viewer: one rule, unchanged in shape.
  Publishing is a request the WisePath owner approves (G2): the path is `published` only once approved; until then
  it keeps its visibility and the author sees "waiting for review". Approving needs an admin role, which does not
  exist today: the smallest form is a list of admin accounts in the API's configuration and one approve/decline
  screen.
- **Complexity**: L (domain, migration, API, dialog, the approval screen). **Depends on**: G1, G2.
- **Validate**: domain tests for every state; API tests that `link` stays out of every list; existing e2e still pass.

### P1.2 Crawlable published pages (acquisition, learning)
- **Problem**: page text appears only after hydration, pages have no URLs, links are spans.
- **Solution**: routes `/p/<path-slug>` and `/p/<path-slug>/<page-slug>`, server slugs; a read-only server render of
  markdown (not Tiptap) with `[[links]]` as `<a href>`, YouTube as a link with a thumbnail that becomes the
  player on click, external links with `rel="ugc"`; the page list as links; the map as an enhancement. A layout
  that does not read cookies, with `revalidate` on publish and edit. Pages not made yet are not shown.
- **Complexity**: L. **Depends on**: P1.1, G8.
- **Validate**: `curl` of a published page shows its text and links; Lighthouse SEO and accessibility; axe; works
  with JavaScript off.

### P1.3 Metadata, sitemap, robots (acquisition)
- **Problem**: title only; no sitemap or robots.
- **Solution**: description, canonical, Open Graph, `lang` from the path, JSON-LD; `sitemap.ts` and `robots.ts`
  from a `GET /public/paths` list of published paths over the quality bar; `noindex` for those under it.
- **Complexity**: M. **Depends on**: P1.1, P1.2, a domain (G4).
- **Validate**: Rich Results Test, Search Console coverage after submitting the sitemap.

### P1.4 Seed the catalog (acquisition, learning)
- **Problem**: an empty catalog ranks for nothing and convinces nobody.
- **Solution**: the owner writes and publishes 10 to 20 good paths in one niche (G3) inside WisePath; this is also
  the best dogfooding of the editor.
- **Complexity**: owner's time, not code. **Validate**: each passes the quality bar; impressions in Search Console
  within 8-12 weeks.

### P1.5 Catalog page and take after signup (acquisition, activation)
- **Problem**: no way to browse published paths; a visitor who signs up must press Study again.
- **Solution**: `/explore`: published paths by language, with title, summary, audience and page count; no
  ranking, likes or comments. `?take=1` on the signup return takes the path and opens it.
- **Complexity**: M. **Depends on**: P1.1. **Validate**: e2e from logged-out visitor to studying in one flow.

### P1.6 Resume where I stopped (retention)
- **Problem**: "Continue" goes to the first unstudied page, Study paths have none, and recents are per device.
- **Solution**: store the last page opened per user and path (server side); home shows "Continue: <page> in
  <path>" for the last path, for Study paths too; Learning paths keep "next to study".
- **Complexity**: M (a table or a column on the membership, an endpoint, a home card).
- **Validate**: e2e: open a page, log out, log in on another browser, continue lands there.

### P1.7 Sessions that survive a pause (retention)
- **Problem**: 24 h sessions without refresh.
- **Solution**: a longer, sliding session (for example 30 days, refreshed on use), with logout revoking it;
  following [security.md](../../.claude/rules/security.md).
- **Complexity**: S-M. **Depends on**: G10. **Validate**: API tests for expiry and refresh.

### P1.8 Minimal metrics (all hypotheses)
- **Problem**: nothing is measured.
- **Solution**: Search Console (free), cookie-less page analytics on public pages only (G7), and a monthly SQL
  report over timestamps already stored ([06-execution-and-metrics.md](06-execution-and-metrics.md)).
- **Complexity**: S. **Validate**: the first monthly report runs.

### P1.9 Run end-to-end tests and axe in CI (trust in changes)
- **Problem**: 15 Playwright tests exist but CI skips them; no axe checks, though plans require them.
- **Solution**: a CI job with Postgres running `test:e2e`, plus `@axe-core/playwright` on the public pages.
- **Complexity**: S-M (a dev dependency). **Validate**: the job is green on main.

### P1.10 Account deletion (trust, LGPD)
- **Problem**: no way to delete an account; the database would cascade, nothing triggers it.
- **Solution**: delete account with password confirmation, offering the export first; published paths go with it.
- **Complexity**: S-M. **Validate**: API test that every table is emptied for the user.

## P2: only if validation says so

| Item | Hypothesis | Gate |
|---|---|---|
| Donations page (Pix, GitHub Sponsors or Ko-fi) | Revenue, trust | First returning learners; allowed on Vercel Hobby |
| "Books and courses for this path" on published roots, curated, disclosed, `rel="sponsored"` | Revenue | ~10k monthly pageviews on published pages, Vercel Pro (G4), accountant consulted |
| Anonymous link previews on published pages (stored when the page is saved) | Learning | Published pages getting visits |
| Topics or tags on the catalog, author pages | Acquisition | More than ~50 published paths |
| Trash for deleted pages and paths, page history | Trust | Shared editing in use |
| Import a folder of Markdown (Obsidian) | Acquisition, trust | Requests from users |
| Keep my marks when a path I took goes private (or a notice period) | Retention, trust | G11 |
| AdSense on published pages only | Revenue | >100k monthly pageviews and affiliates below target |
| Remove the leftover review module and table | Maintenance | Any time; cleanup |

## Out of scope

AI features; subscriptions; ads before the P2 gate; sponsored paths; custom domains; real-time collaboration;
native apps; comments, likes, follower counts, leaderboards; copying or cloning paths; auto-generated topic pages;
the browser extension (plan 8); bringing back spaced review or templates.
