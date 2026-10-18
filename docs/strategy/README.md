# Strategy: a public catalog of paths that is also a personal notebook

Analysis of 2026-10-18, read-only on the code. Goal under study: WisePath as "a public catalog of knowledge paths
that also works as a personal notebook", free to learn, no subscriptions, no AI in this phase, run by one person,
with passive revenue of about R$1,000/month profit as a hypothesis to validate.

| Doc | Content |
|---|---|
| [01-current-state.md](01-current-state.md) | A. What exists, what is partial, what is missing, with file references |
| [02-market.md](02-market.md) | B. Competitors, what they teach, positioning |
| [03-product-vision.md](03-product-vision.md) | C. Revised vision: audience, the two spaces, three visibility states, scope |
| [04-acquisition-and-revenue.md](04-acquisition-and-revenue.md) | D. Organic acquisition, revenue options, costs, scenarios |
| [05-backlog.md](05-backlog.md) | E. P0, P1, P2 and out of scope |
| [06-execution-and-metrics.md](06-execution-and-metrics.md) | F. Stages with done-criteria, and the few metrics to watch |
| [07-open-decisions.md](07-open-decisions.md) | G. Decisions for the owner |

## The eight questions, answered

1. **What must change for a public catalog?** A third visibility state, *published*, separate from today's "public by
   link" (which stays `noindex`); published pages rendered as text on the server with their own URLs and real
   links; metadata, sitemap and robots; a simple catalog page; terms and a privacy policy. Today public pages show
   their text only after JavaScript runs, have one URL per path, and are deliberately `noindex`.
2. **What exists and must be kept?** The authoring loop, the map read from links, per-learner progress, sharing
   without copies, the single access rule (`accessOf`), the 404 that hides private paths, i18n, keyboard use, tests
   and CI. The catalog is built on them, not instead of them.
3. **How does the catalog bring people without constant promotion?** Each published path is a hub (root) with
   spokes (pages) that answer specific searches, linked to each other: the structure that works for roadmap.sh's
   organic growth. It needs good first content, written by the owner (10-20 paths in one niche), and months for
   search to notice. Promotion is replaced by writing, not by nothing.
4. **How does the notebook stay free and trustworthy?** No feature of studying is ever paid; revenue elements live
   only on published pages, never in the editor or private paths. Add what trust lacks today: Markdown export,
   password reset, account deletion, longer sessions, terms and privacy.
5. **Which passive revenue is plausible?** In order: donations (allowed on Vercel's free plan), curated and disclosed
   book and course links on published paths, and only at scale, ads on published pages. In the intermediate
   scenario R$1,000 profit needs about 100k pageviews a month on published pages: a second-year goal, if the
   content ranks. Vercel Hobby forbids ads, payments and affiliate-first sites: commercial revenue means Vercel Pro.
6. **What comes first?** Trust basics (export, delete copy fix, recents leak, e2e in CI) and the decisions in G;
   then the published state and crawlable pages; then content.
7. **How to know it works?** Search Console impressions, visits per published path, "Study this path" from public
   pages, signups from public paths, learners active in weeks 2-4. Most come from columns already stored; no
   analytics pipeline.
8. **What stays out?** AI, subscriptions, early ads, sponsored paths, custom domains, real-time collaboration,
   native apps, social features, copying paths, auto-generated pages, the browser extension, spaced review.

## The honest risk

The plan is cheap to build and cheap to run (~R$5-40/month until revenue). The uncertain part is not code: it is
whether paths written in WisePath rank and whether visitors become learners. Stages 1-7 are worth doing for the
learners even if the revenue target is never reached; revenue work waits until the numbers say it can work.
