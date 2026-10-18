# D. Acquisition and revenue

Researched 2026-10-18. **[S]** sourced fact, **[S2]** secondary source to re-check, **[E]** estimate. Not legal or
tax advice. The R$1,000/month target is a hypothesis, not a forecast.

## How the catalog brings people in

The shape that works is hub and spoke: a hub page per subject, spoke pages for the specific questions, linking
back. A WisePath path already is one: the root is the hub, its pages are the spokes, `[[links]]` are the internal
links. What is missing is making it readable to a crawler (see [01-current-state.md](01-current-state.md)):

1. **One URL per published page**, readable: `/p/<path-slug>/<page-slug>`, made by the server.
2. **The page's text in the first HTML**: a read-only markdown render on the server for public pages, separate from
   the Tiptap editor. `markdown-it` already ships with `tiptap-markdown`; whether to depend on it directly is
   decision G8.
3. **`[[links]]` as `<a href>`** between published pages; the page list and "related pages" as links too.
4. **Metadata**: description from the path and the page's first paragraph, canonical URL, Open Graph, `lang` from
   the path's language, JSON-LD (`LearningResource` for the root, `Article` for pages).
5. **`sitemap.ts` and `robots.ts`** listing published paths that passed the quality bar.
6. **Cacheable public pages**: a layout for `/p/*` that does not read cookies, `revalidate` on publish and on edit,
   so crawlers do not hit the API's cold start.

Guardrails, from Google's own guidance:

- Only **published** paths are listed; "anyone with the link" stays `noindex`.
- **Quality bar** before indexing (proposal, decision G2): a root with real text, at least about eight created pages
  with text, no pages-not-made-yet left on the root. Below it the path is listed but `noindex`.
- `rel="ugc"` on links inside authors' text; `rel="sponsored"` on any affiliate link.
- Ghost titles (pages not made yet) are not shown on public pages.
- A "report this path" link (an email to start with) and the owner's power to unpublish.

From a visit to a learner: the visitor reads a page, sees the map, and "Study this path" keeps their place
(take after signup, `?take=1`); then "continue where you left off" on their home brings them back.

**What cannot be automated away: the first content.** A catalog with no good paths ranks for nothing. The plan
assumes the owner writes 10 to 20 good paths in one niche (decision G3) before any growth is expected, and that
search traffic takes months to arrive. This is the main cost of the strategy, in the owner's time.

## Revenue options

| Option | Fit with "free to learn" | Automated | Needs | Verdict |
|---|---|---|---|---|
| Donations: Pix, GitHub Sponsors (0% fee [S]), Ko-fi (0% platform fee [S2]), Apoia.se (13% recurring [S2]) | Full | Yes | A "support WisePath" page | **First.** Allowed on Vercel Hobby [S]. Small: weak evidence suggests R$0.01-0.10 per monthly active user [E] |
| Curated book links (Amazon Associados BR: books 10%, Kindle devices 9.5% [S]; 24 h cookie [S2]; 3 sales in 180 days or the account closes [S]) | Full, if relevant and disclosed | Yes | A "books for this path" block on published roots, `rel="sponsored"`, disclosure | **Second**, once there is traffic |
| Curated course links (Coursera 15-45%, 30 days [S]; Alura 8% via Awin [S2]; Domestika 40%/20% [S]; Udemy 7-15%, 7 days [S2]) | Full, if curated | Yes | Same block | With books. Avoid Hotmart-style infoproducts: high commission, high trust risk |
| One-time supporter badge or designed print edition | Full, if the plain export stays free | Yes (payments) | Payments, Vercel Pro | Later, optional |
| AdSense on published pages only | Weak: ads distract while studying | Yes | Vercel Pro; **the publisher answers for user content on pages with ads** [S] | Only above ~100k pageviews/month and if affiliates fall short |
| Carbon Ads, EthicalAds | Good tone | Yes | Developer audience, 50k pv (EthicalAds) [S], exclusivity (Carbon) [S] | Poor fit |
| Sponsored paths, custom domains | n/a | No / recurring | Selling, or a subscription in disguise | Out |

**Hosting rule** [S]: Vercel Hobby forbids commercial use, naming ads, payments and affiliate-first sites;
donations are allowed. Any affiliate block, payment or ad means Vercel Pro (US$20/month) or another host.

## Costs

Exchange rate assumed: R$5.2/USD (R$5.15 on 2026-09-16 [S]).

| Item | Donations only | Commercial |
|---|---|---|
| Vercel | Hobby, R$0 | Pro, ~R$105 [S] |
| Neon | Free | Launch, ~R$25-105 [E] |
| Domain | ~R$5 | ~R$5 |
| Email (password reset) | Resend free, 3,000/month [S2] | Same |
| **Floor per month** | **~R$5-40** | **~R$135-250** |

## Scenarios

Target: R$1,000 profit. Commercial costs ~R$170; if the income is taxed at 27.5% via carnê-leão (depends on the
owner's other income), gross needed is **~R$1,600/month**; at a lower bracket, nearer R$1,200 [E]. Revenue is per
1,000 pageviews of published pages (Y); pageviews needed = 1,600 / Y × 1,000. Every rate below is an assumption.

| Mix | Assumptions (conservative / intermediate / optimistic) | Y in R$ | Pageviews per month needed |
|---|---|---|---|
| AdSense, 70% pt-BR / 30% English | blended RPM R$5 / 12 / 24 [E] | 5.1 / 12 / 24 | 314k / 133k / 67k |
| Books only | CTR 0.5 / 1 / 2%; conversion 3 / 5 / 8%; basket R$70 / 90 / 120; commission 8 / 9 / 10% | 0.84 / 4.05 / 19.2 | 1.9M / 395k / 83k |
| Courses only | CTR 0.3 / 0.7 / 1.5%; conversion 1 / 2 / 3%; R$25 / 50 / 90 per sale | 0.75 / 7.0 / 40.5 | 2.1M / 229k / 40k |
| Books + courses + donations | the above, plus donations R$1.25 / 3.75 / 12.5 | 2.84 / 14.8 / 72.2 | 563k / 108k / 22k |
| Same + AdSense | | 7.9 / 26.8 / 96.2 | 201k / 60k / 17k |
| Donations only (costs ~R$40, so ~R$1,100 gross) | R$0.01 / 0.03 / 0.10 per monthly active user | | ~880k / ~290k / ~88k pageviews |

**Reading it honestly.** In the intermediate case the target needs on the order of **100k pageviews a month** on
published pages, without ads. For a new site with no brand, that is a goal for the second year at the earliest, and
only if the content ranks. The first milestones are smaller and testable: published pages indexed, then the first
1k, then 10k monthly visits; revenue work starts when 10k is reached (see [05-backlog.md](05-backlog.md), P2).

## Risks

- **One company for traffic**: a core update can cut organic traffic sharply; there is no second channel yet.
- **Affiliate terms change**: Amazon changed its Operating Agreement on 2026-04-14 [S]; Udemy's rate reportedly fell [S2].
- **Trust**: ads and pushy infoproducts cost the credibility a learning product lives on. Disclose, curate, keep
  every revenue element off the editor and the personal notebook.
- **User content liability**: Google's UGC rules and AdSense's publisher responsibility; Amazon bans sites with
  some content [S2]. Only curated, published paths carry any revenue element.
- **Brazilian tax**: foreign income (Google, Impact, Ko-fi) goes through carnê-leão monthly [S2]; MEI may not cover
  advertising and affiliate income [S2]. One consultation with an accountant before revenue starts.

## Sources

Vercel fair use https://vercel.com/docs/limits/fair-use-guidelines · Vercel Pro https://vercel.com/docs/plans/pro ·
Amazon BR rates https://associados.amazon.com.br/help/node/topic/GRXPHT8U84RAYDXZ ·
Amazon agreement changes https://affiliate-program.amazon.com/help/operating/compare ·
Amazon 180-day rule https://associates.amazon.ca/help/node/topic/G7MJTPEP9NC3YKMG ·
Coursera https://coursera.org/about/affiliates · Domestika https://domestika.org/en/affiliates ·
Alura (Awin) https://ui.awin.com/merchant-profile/23465 ·
Udemy https://partnersupport.udemy.com/hc/en-us/articles/360049413973 ·
AdSense and UGC https://blog.google/products/adsense/your-guide-user-generated-content/ ·
EthicalAds https://www.ethicalads.io/publishers/faq/ · Carbon https://www.carbonads.net/faq ·
GitHub Sponsors fees https://docs.github.com/en/sponsors/sponsoring-open-source-contributors/about-sponsorships-fees-and-taxes ·
Donations study https://2020.icse-conferences.org/details/icse-2020-papers/31/How-to-Not-Get-Rich-An-Empirical-Study-of-Donations-in-Open-Source ·
Neon https://neon.com/pricing · Resend https://resend.com/blog/new-free-tier ·
Exchange rate https://www.meelion.com/indicadores-financeiros/dolar-hoje/ ·
Carnê-leão (secondary) https://quasa.io/pt/media/adsense-vindo-do-exterior-exige-apuracao-mensal-nao-espere-a-declaracao

Not found: Amazon BR minimum payout, AdSense RPM for Brazilian education sites, Catarse fees, the 2026 income tax
exemption change.
