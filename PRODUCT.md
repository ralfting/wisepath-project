# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: anyone studying a subject on their own (decided 2026-10-17): a language, an instrument, literature, history, programming, an exam. They pull from scattered videos, articles, books and courses, and need one place to keep what they found, how it fits together and how far they got. They need not know markdown: the editor formats as they type, and markdown is what it saves, not what they must learn.

Secondary: people a path is shared with, or who take a public one to study it with their own progress. Authoring comes first; following is a bonus, not the main entry point.

## Product Purpose

WisePath lets a learner map what they are learning. Every map has one root page named after the subject ("NestJS"); every other page is a page of free-form markdown (explanations, notes, links, embedded videos), at any depth. Pages connect only through `[[Title]]` links written in their text: linking a title that does not exist yet and clicking it creates the page. The map is read from those links, outward from the root. The core loop is authoring: write a page, link the next ones (they show on the map at once, as pages not made yet), open them to create them. A path is a **Study** (open notes, no progress) unless it is made a **Learning path**, where learners mark pages studied and pick up where they stopped.

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
7. In a learning path, mark pages studied; "Continue studying" opens the next one. Watching a video, take timestamped notes under it without leaving it.
8. Share the map with people (to read or to edit) or make it public; each of them studies it with their own progress, and it stays the author's.

Used in a desktop browser alongside the material being studied (video, docs, IDE), often over many sessions.

## Capabilities and Constraints

- Accounts: email/password sign up, log in, persistent session, log out (Phase 1, in progress).
- A map (path) has exactly one root page (its title is the map's name; it can't be deleted) and any number of pages at any depth. Page content is markdown with preview and inline YouTube embeds.
- Pages connect only through `[[Title]]` links, and are created only from one: a link to a title no page has is shown as missing, and clicking it offers to create the page. Titles are unique within a map.
- The map is read from the links, level by level from the root, in the order the links are written: the first link that reaches a page makes it a branch of the linking page; other links show as arrows, except links back to the root or to the page's own ancestors, which only appear as related pages. Pages no link reaches are orphans, listed apart and left out of progress.
- Any page can be shown as a module: drawn larger, with a colour and icon the learner picks; pages below it take its colour. Nothing else changes.
- Resources live inside the page's markdown; there is no separate resource model. A YouTube address on its own line embeds the video, with `[mm:ss]` notes below it that play it from there; a web address shows as its site's icon and title. The features as they stand are in `docs/FEATURES.md`.
- Views: a horizontal mind map (root in the centre, branches split left and right, each level a column further out) and an indented list. The selected page opens in a side panel with its related pages (where it branches from, its branches, links out, links in); a full-screen editor is one click away.
- Kinds: a map is a Study (the default: no progress anywhere) or a Learning path; switching keeps the studied flags, hidden in a Study.
- Activities and questions (docs/plans/22-page-activities.md, 24-page-questions.md): a page can ask its reader to do something (`> [!activity]`, ticked done) or to answer a question (`> [!question]`, `/question`, answered in a field under it). Ticks and answers are each reader's own and never part of the page's text; in a learning path a page counts as studied only once nothing it asks is open.
- Progress (learning paths): every page has a studied flag, the root included. The root is the first step of the study and progress goes outward from it: the map's count covers the root and every page it reaches, every page with branches shows the count of the pages below it, and "Start" / "Continue studying" goes to the first page not studied yet, in map order, so a fresh path starts at the root.
- Sharing never copies (decided 2026-10-17, docs/plans/14-public-and-shared-paths.md): the owner invites people to read or edit, or makes the path public; anyone can take a public path to study it. Each learner's progress is their own and nobody sees another's. The content stays the owner's and follows their edits; nobody can clone or republish someone else's path.
- Out of scope for v1: real-time collaboration, built-in templates, social features (likes, comments on others' projects), mobile apps.
- Stack: Turborepo monorepo — Next.js 15 + Mantine 8 (design system, customised only through `apps/web/theme.ts`) + Effect 4 (`apps/web`), NestJS + Effect + Drizzle (`apps/api`), the domain model (`packages/domain`) and API contract (`packages/contract`).
- Terminology: "map" (code: path) = the subject; "project" = a user's group of paths, one of them the default; "root" = the map's centre page; "page" = any other page; "branch" = a page reached first through a link from another; "arrow" = any other link between pages on the map; "citation" = an `@[[Title]]` pointing at a page without placing it, drawn as a dashed line; "module" = a page shown larger, only a display choice; "orphan" = a page no link reaches.
- Undecided: AI features. The repo name says "WisePath AI", but no AI capability is defined; do not imply one.

## Brand Commitments

- User-facing name is **WisePath** (no "AI" suffix for now).
- Visual identity: bright and calm, built only from Mantine tokens in `apps/web/theme.ts`. Blue for actions and the page up next, teal to cyan for progress, Mantine's named colours for modules, Inter for all text, white cards on a near-white ground. No logo or voice guide yet.

## Evidence on Hand

None. No users, testimonials, metrics or screenshots exist yet. The one example path is the literature sample offered on a first visit, titled as a sample. Do not fabricate the rest; demo content must read as sample content.

## Product Principles

1. Writing and connecting is the product: pages of free markdown and the links between them; the map is only a reading of those links.
2. The author owns their journey — a personal notebook first, shareable second.
3. Respect the learner: plain, precise language, and help that shows the way once (a first visit, a sample path) rather than tutorials that stay in the way.
4. Progress is honest and simple: one page, one completion state.
5. Sharing lends a path, never hands it over: others study it with their own progress, and it stays its author's.
