# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: technical learners comfortable with markdown — developers, plus people learning data, design tooling and similar technical subjects. They are studying a topic on their own (e.g. "Learn Javascript"), pulling from scattered videos, docs, articles and books, and need one place to keep what they found and how it fits together.

Secondary: followers who receive a copy of someone else's path and work through it with their own progress. Authoring comes first; following is a bonus, not the main entry point.

## Product Purpose

WisePath lets a learner map what they are learning. A map has one root page named after the subject ("NestJS"), modules around it that the learner defines ("Providers", "Authentication"), and topics inside each module ("JWT", "Guards"). Every one of them is a page of free-form markdown (explanations, notes, links, embedded videos). Any page can reference any other with a `[[Title]]` link, so concepts in different modules connect directly. The core loop is authoring: add modules and topics, write their markdown, reference related pages. Learners mark topics studied and pick up where they stopped.

Success: a learner can come back months later — or hand the project to someone else — and find what they wrote about each concept, the resources they kept, and how the pieces connect.

## Positioning

The connections between concepts are treated as being as valuable as the notes themselves. A map is a shallow tree (root, modules, topics) that gives the subject a shape, plus cross references that cut across it wherever concepts meet. It is viewed as a radial mind map or a list. It is a personal learning notebook that happens to be shareable, not a course platform or a bookmark manager.

## Operating Context

Typical workflow:
1. Start learning something new.
2. Create a map for it; its root page carries the subject's name.
3. Split the subject into modules ("Fundamentals", "Providers", "Testing").
4. Add topics to each module ("What providers are", "Scopes").
5. For each page, write free-form markdown: the concept, notes, links, YouTube embeds.
6. Reference related pages anywhere in the map with `[[Title]]`.
7. Mark topics studied; "Continue studying" opens the next one.
8. Share the map; the recipient gets an independent copy.

Used in a desktop browser alongside the material being studied (video, docs, IDE), often over many sessions.

## Capabilities and Constraints

- Accounts: email/password sign up, log in, persistent session, log out (Phase 1, in progress).
- Maps (projects) are three levels of pages: exactly one root (its title is the map's name), modules under the root, topics under modules. Page content is markdown with preview and inline YouTube embeds.
- Modules are the learner's own: they add, rename, delete (with their topics) and restyle them (colour and icon), and can move topics between modules.
- Cross references: any page can link any other with `[[Title]]`. Links that are not parent and child show on the map as arrows; each page lists its related pages (parent, children, links out, links in).
- Resources live inside the page's markdown; there is no separate resource model.
- Views: a radial mind map (root in the centre, modules around it, topics beside their module) and a list grouped by module. The selected page opens in a side panel; a full-screen editor is one click away.
- Progress counts topics: a studied flag per topic, a counter per module and per map, and "Continue studying" goes to the first topic not studied yet, in map order.
- Sharing creates a full independent copy; each user owns their own copy and progress.
- Out of scope for v1: real-time collaboration, hierarchy deeper than root, module and topic, built-in templates, social features (likes, comments on others' projects), mobile apps.
- Stack: Turborepo monorepo — Next.js 15 + Mantine 8 (design system, customised only through `apps/web/theme.ts`) + Effect 4 (`apps/web`), NestJS + Prisma (`apps/api`), the domain model (`packages/domain`) and API contract (`packages/contract`).
- Terminology: "map" (code: project) = the subject; "root" = the map's centre page; "module" = a group of topics the learner defines; "topic" = a page inside a module; "cross reference" = a `[[link]]` between pages that are not parent and child.
- Undecided: AI features. The repo name says "WisePath AI", but no AI capability is defined; do not imply one.

## Brand Commitments

- User-facing name is **WisePath** (no "AI" suffix for now).
- Visual identity: bright and calm, built only from Mantine tokens in `apps/web/theme.ts`. Blue for actions and the topic up next, teal to cyan for progress, Mantine's named colours for modules, Inter for all text, white cards on a near-white ground. No logo or voice guide yet.

## Evidence on Hand

None. No users, testimonials, metrics, example paths or screenshots exist yet. Do not fabricate them; demo content must read as sample content.

## Product Principles

1. Writing and connecting is the product: pages of free markdown and the links between them; the tree only gives them a shape.
2. The author owns their journey — a personal notebook first, shareable second.
3. Respect technical learners: markdown, precise language, no hand-holding.
4. Progress is honest and simple: one topic, one completion state.
5. Sharing hands over a copy, never a dependency.
