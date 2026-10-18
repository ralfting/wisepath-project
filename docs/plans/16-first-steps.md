# 16. First steps that explain themselves

Done 2026-10-17 (steps 1 to 6), from a usability review (a first visit walked through in the browser, desktop and phone
widths). The app is quick once understood (search, capture, Inbox and the keyboard rated 8 of 10) but a first
visit rated 5: the main gesture seems to do nothing, and the first screens explain little. This plan fixes the
entry with help that shows the way once ([PRODUCT.md](../../PRODUCT.md), principle 3).

## What the review found

1. **Writing `[[Ownership]]` adds nothing to the map.** A link to a page that doesn't exist is dashed in the text,
   but the map skips it (`linksOf` drops missing pages), so after "Start with [[Ownership]] and then [[Borrowing]]"
   the map still says "0 pages". Each page appears only after clicking its link and confirming Create page.
2. **An empty start.** The landing page is a title and two buttons; a new account sees "No paths here yet." and the
   General project with its Default badge, before it has anything to group.
3. **Words in the drawer.** The main page is labelled "Centre of the path" with "The path" under its title.
4. **Phone:** the paths page's search field is squeezed to "Se".

Already fine, so not in the plan: the New path dialog explains Study and Learning path in one line each.

## The changes

1. **Links not made yet show on the map.** A link to a missing page is drawn as a ghost page: dashed, dimmed,
   beside the page that links to it, and listed the same way in the list view. Clicking it (or Enter) makes the page
   and opens it, the same command as the link card's Create page. The root's count stays "pages that exist"; the
   ghost says what it is to assistive tech ("Ownership, not made yet"). The map stays a reading of the links
   (principle 1): nothing is created until the learner chooses to.
   - Domain: `pendingLinks(path)` (page, title) beside `linksOf`, tested; the tree gives each page its pending
     children after its real ones.
   - Web: `MindMap` and `MapList` draw them; `mindLayout` places them like leaves.
2. **The first visit says what to do, once.** While the learner has no path, the paths page shows one compact card
   in place of the empty group: three lines (make a path, link pages with `[[ ]]`, mark what you studied in a
   learning path) and two actions, New path and Try a sample path. The sample is about something anyone can follow,
   literature (decided 2026-10-17, not the NestJS map the tests use), written in the account's language, copied into
   the default project with "(sample)" in its title, so it reads as sample content (PRODUCT.md, "Evidence on Hand").
   The card goes away with the first path and never comes back.
   - Domain: `literatureSample(locale)` in English and Portuguese, built like the test map.
   - API: `POST /api/paths/sample` copies it with `copyPath` into the default project; retry-safe (a second call
     returns the copy already made).
3. **One project shows no project header.** With a single project the paths page shows its cards without the group
   header and the Default badge; "New project" stays. Two projects bring the groups back.
4. **The landing says what WisePath is**: three short lines under the tagline (pages in markdown, linked with
   `[[ ]]`, read as a map you study), no screenshots or claims (none exist yet).
5. **Words:** the drawer labels the main page "Main page" and shows the path's description, or nothing, under it.
6. **Phone:** the paths page's search field takes the full width on its own line below `sm`.

## Steps (one commit each)

1. Domain `pendingLinks` and the tree's pending children, with tests.
2. Ghost pages on the map and in the list, with a component test and the e2e of writing two links.
3. Sample path endpoint and its API test.
4. First visit card, single-project view, with tests.
5. Landing lines, drawer words, phone search; messages in en and pt-BR.
6. FEATURES.md; this plan's status.

## Checks

- Writing `[[A]]` and `[[B]]` shows two ghost pages at once; Enter on one makes it and opens it; the other stays a
  ghost; a reload shows the same.
- A new account sees the first visit card; Try a sample path opens the copy; the card is gone after; a second
  click of the sample (a retry) makes no second copy.
- One project: no header; a second project: both headers.
- axe clean in light and dark on the new screens; both languages; phone width checked.
