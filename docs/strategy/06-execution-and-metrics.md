# F. Incremental execution plan, and how to know it works

Small stages, each shippable alone, each with a check that it is done. Stages 1 and 2 can run in parallel
(different screens); the others follow in order. Each stage gets a plan in `docs/plans/` first.

| Stage | Items | Done when | Validated by |
|---|---|---|---|
| 0. Decide | [07-open-decisions.md](07-open-decisions.md) G1-G6 | Each decision written in the plan it affects | The owner's answers |
| 1. Trust basics (done 2026-10-18; axe moved to stage 4) | P0.1 export, P0.3 delete copy, P0.4 recents, P1.9 e2e in CI | A path downloads as Markdown that Obsidian opens; e2e and axe run in CI | Tests green on main |
| 2. Accounts | P1.10 account deletion (done 2026-10-18), P1.7 sessions | A learner can stay logged in for weeks and leave with their data | API and e2e tests |
| 2b. Password reset | P0.2, after stage 2 (2026-10-18: waits for the Gmail app password) | A learner who forgot the password gets back in | API and e2e tests |
| 3. Publishing state (published state done 2026-10-18, plan 19; terms and privacy drafted in docs/legal, waiting for review) | P0.5 terms and privacy, P1.1 `published` | Today's public links unchanged and `noindex`; an author can publish with a summary, language and audience | Domain, API, e2e tests |
| 4. Crawlable pages (done 2026-10-18, plan 20; caching left for later: the root layout reads cookies) | P1.2 | A published page answers with its text and links with JavaScript off, from cache | `curl`, Lighthouse, axe |
| 5. Search engines (prepared 2026-10-18: sitemap, robots, canonical and Open Graph wait for SITE_URL; the domain is not bought yet) | P1.3, P1.8, domain | Sitemap submitted, Search Console and page analytics live | Coverage report shows pages indexed |
| 6. Content | P1.4 | 10-20 published paths in the chosen niche over the quality bar | Impressions in Search Console |
| 7. Visitors become learners (catalog page done 2026-10-19; take after signup and resume still open) | P1.5 catalog and take after signup, P1.6 resume | A visitor goes from a search result to studying in one flow; home shows where they stopped | e2e; activation metrics below |
| 8. Read the numbers | none | 8-12 weeks of data after stage 6 | Monthly review against the questions below |
| 9. Revenue, gated | P2 donations, then curated affiliate links | Gates in [05-backlog.md](05-backlog.md) met | Revenue and cost metrics |

Per stage, the repo's rules apply: a plan, atomic commits, `pnpm typecheck && pnpm lint && pnpm test`, the
code-reviewer agent, `docs/FEATURES.md` updated.

What this plan reuses rather than rebuilds: the access rule (`accessOf`), the take and membership model, the
public read endpoint, per-learner progress, i18n, the markdown already stored, CI and deploy.

## Metrics

No baseline exists, so none is assumed: the first eight weeks of each metric are the baseline. Each metric has a
question it answers and a place it comes from that costs nothing or almost nothing.

| Kind | Metric | The question | Source |
|---|---|---|---|
| Audience | Search impressions and clicks per published path | Does anything rank? Which subjects? | Google Search Console |
| Audience | Visits per published page, and from where (search, link, direct) | Which paths earn visits? | Cookie-less page analytics on public pages (G7) |
| Activation | "Study this path" clicks from a public page | Does reading lead to studying? | One counted event, or the analytics tool |
| Activation | Accounts created from a public path; first page written within 7 days | Do visitors become learners, and do they write? | `User.createdAt` plus a `source` saved at signup; `pages.updated_at` |
| Retention | Learners with a page studied or edited in weeks 2-4 after signup | Do they come back? | `page_progress.studied_at`, `pages.updated_at` |
| Retention | Paths with any activity in the last 30 days | Are paths alive or abandoned? | Same columns |
| Sharing | Paths shared, made link-public, published; paths taken | Is sharing used? | `path_members.created_at`, `paths.visibility` |
| Revenue | Revenue by source, monthly costs, profit | Is it paying for itself? | Affiliate dashboards, Vercel and Neon bills, a spreadsheet |

Most activation and retention numbers come from columns already stored; the only additions are a `source` on signup
and a counter for "Study this path". A monthly SQL query and a spreadsheet are enough; no event pipeline.

Questions to decide on after stage 8 (not targets):

- Are published pages indexed and getting impressions? If not after ~12 weeks, the problem is technical or content,
  not monetization.
- Do visitors who arrive by search start studying? If not, the public page or the path's quality is the problem.
- Do learners return in weeks 2-4? If not, resume and the notebook matter more than more traffic.
- Is any revenue work worth it yet? Only when published pages pass ~10k monthly visits.
