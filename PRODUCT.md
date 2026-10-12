# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: technical learners comfortable with markdown — developers, plus people learning data, design tooling and similar technical subjects. They are studying a topic on their own (e.g. "Learn Javascript"), pulling from scattered videos, docs, articles and books, and need one place to keep what they found and how it fits together.

Secondary: followers who receive a copy of someone else's path and work through it with their own progress. Authoring comes first; following is a bonus, not the main entry point.

## Product Purpose

WisePath lets a learner map what they are learning. Every map has one root page named after the subject ("NestJS"); every other page is a page of free-form markdown (explanations, notes, links, embedded videos), at any depth. Pages connect only through `[[Title]]` links written in their text: linking a title that does not exist yet and clicking it creates the page. The map is read from those links, outward from the root. The core loop is authoring: write a page, link the next ones, click to create them. Learners mark pages studied and pick up where they stopped.

Success: a learner can come back months later — or hand the project to someone else — and find what they wrote about each concept, the resources they kept, and how the pieces connect.

## Positioning

The connections between concepts are treated as being as valuable as the notes themselves. The links are the structure: read from the root, the first link that reaches a page makes it a branch, and every other link shows as an arrow across the map. It is viewed as a horizontal mind map or an indented list. It is a personal learning notebook that happens to be shareable, not a course platform or a bookmark manager.

## Operating Context

Typical workflow:
1. Start learning something new.
2. Create a map for it; its root page carries the subject's name.
3. In the root, write `[[links]]` to the first pages ("Fundamentals", "Providers") and click them to create them.
4. Keep going in each page, as deep as the subject needs; mark the big areas as modules so they stand out.
5. For each page, write free-form markdown: the concept, notes, links, YouTube embeds.
6. Reference related pages anywhere in the map with `[[Title]]`.
7. Mark pages studied; "Continue studying" opens the next one.
8. Share the map; the recipient gets an independent copy.

Used in a desktop browser alongside the material being studied (video, docs, IDE), often over many sessions.

## Capabilities and Constraints

- Accounts: email/password sign up, log in, persistent session, log out (Phase 1, in progress).
- A map (project) has exactly one root page (its title is the map's name; it can't be deleted or marked studied) and any number of pages at any depth. Page content is markdown with preview and inline YouTube embeds.
- Pages connect only through `[[Title]]` links, and are created only from one: a link to a title no page has is shown as missing, and clicking it offers to create the page. Titles are unique within a map.
- The map is read from the links, level by level from the root, in the order the links are written: the first link that reaches a page makes it a branch of the linking page; other links show as arrows, except links back to the root or to the page's own ancestors, which only appear as related pages. Pages no link reaches are orphans, listed apart and left out of progress.
- Any page can be shown as a module: drawn larger, with a colour and icon the learner picks; pages below it take its colour. Nothing else changes.
- Resources live inside the page's markdown; there is no separate resource model.
- Views: a horizontal mind map (root in the centre, branches split left and right, each level a column further out) and an indented list. The selected page opens in a side panel with its related pages (where it branches from, its branches, links out, links in); a full-screen editor is one click away.
- Progress: every page but the root has a studied flag. The root shows the whole map's count, every page with branches shows the count of the pages below it, and "Continue studying" goes to the first page not studied yet, in map order.
- Sharing creates a full independent copy; each user owns their own copy and progress.
- Out of scope for v1: real-time collaboration, built-in templates, social features (likes, comments on others' projects), mobile apps.
- Stack: Turborepo monorepo — Next.js 15 + Mantine 8 (design system, customised only through `apps/web/theme.ts`) + Effect 4 (`apps/web`), NestJS + Prisma (`apps/api`), the domain model (`packages/domain`) and API contract (`packages/contract`).
- Terminology: "map" (code: project) = the subject; "root" = the map's centre page; "page" = any other page; "branch" = a page reached first through a link from another; "arrow" = any other link between pages on the map; "module" = a page shown larger, only a display choice; "orphan" = a page no link reaches.
- Undecided: AI features. The repo name says "WisePath AI", but no AI capability is defined; do not imply one.

## Brand Commitments

- User-facing name is **WisePath** (no "AI" suffix for now).
- Visual identity: bright and calm, built only from Mantine tokens in `apps/web/theme.ts`. Blue for actions and the page up next, teal to cyan for progress, Mantine's named colours for modules, Inter for all text, white cards on a near-white ground. No logo or voice guide yet.

## Evidence on Hand

None. No users, testimonials, metrics, example paths or screenshots exist yet. Do not fabricate them; demo content must read as sample content.

## Product Principles

1. Writing and connecting is the product: pages of free markdown and the links between them; the map is only a reading of those links.
2. The author owns their journey — a personal notebook first, shareable second.
3. Respect technical learners: markdown, precise language, no hand-holding.
4. Progress is honest and simple: one page, one completion state.
5. Sharing hands over a copy, never a dependency.
