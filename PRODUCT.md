# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: technical learners comfortable with markdown — developers, plus people learning data, design tooling and similar technical subjects. They are studying a topic on their own (e.g. "Learn Javascript"), pulling from scattered videos, docs, articles and books, and need one place to keep what they found and how it fits together.

Secondary: followers who receive a copy of someone else's path and work through it with their own progress. Authoring comes first; following is a bonus, not the main entry point.

## Product Purpose

WisePath lets a learner document what they learned about a topic: a project (topic) broken into pages (subtopics), each holding free-form markdown (explanations, notes, links, embedded videos), connected to each other to show how the concepts relate. The core loop is authoring: create a page, write its markdown, connect it to related pages. Learners can also mark pages studied and share the whole project.

Success: a learner can come back months later — or hand the project to someone else — and find what they wrote about each concept, the resources they kept, and how the pieces connect.

## Positioning

The connections between concepts are treated as being as valuable as the notes themselves. Projects are graphs of related pages, not folders or linear courses, viewable as a mindmap or a list. It is a personal learning notebook that happens to be shareable, not a course platform or a bookmark manager.

## Operating Context

Typical workflow:
1. Start learning something new.
2. Create a project for it.
3. Break the topic into pages ("Closures", "Promises", "Async/Await").
4. For each page, write free-form markdown: the concept, notes, links, YouTube embeds.
5. Connect related pages.
6. Optionally mark pages studied.
7. Share the project; the recipient gets an independent copy.

Used in a desktop browser alongside the material being studied (video, docs, IDE), often over many sessions.

## Capabilities and Constraints

- Accounts: email/password sign up, log in, persistent session, log out (Phase 1, in progress).
- Projects (topics) and pages (subtopics); page content in markdown with preview; inline YouTube embeds.
- Pages connect as a graph, not a hierarchy. A connection means only "related": it has no direction and implies no study order; nothing is computed from it.
- Resources live inside the page's markdown; there is no separate resource model.
- Views: mindmap (navigate, create and connect pages) and list. Opening a page goes to a full-screen markdown editor with its connections beside it.
- Progress is a discreet per-page studied flag plus a project counter; the product does not compute a "next" page.
- Sharing creates a full independent copy; each user owns their own copy and progress.
- Out of scope for v1: real-time collaboration, nested page hierarchy, built-in templates, social features (likes, comments on others' projects), mobile apps.
- Stack: Turborepo monorepo — Next.js 15 + Mantine 8 (design system, customised only through `apps/web/theme.ts`) + Effect 4 (`apps/web`), NestJS + Prisma (`apps/api`), the domain model (`packages/domain`) and API contract (`packages/contract`).
- Terminology: "project" = topic, "page" = subtopic, "connection" = undirected link between related pages.
- Undecided: AI features. The repo name says "WisePath AI", but no AI capability is defined; do not imply one.

## Brand Commitments

- User-facing name is **WisePath** (no "AI" suffix for now).
- No logo, voice guide or visual identity committed yet.

## Evidence on Hand

None. No users, testimonials, metrics, example paths or screenshots exist yet. Do not fabricate them; demo content must read as sample content.

## Product Principles

1. Writing and connecting is the product: pages of free markdown and the links between them matter more than any computed structure.
2. The author owns their journey — a personal notebook first, shareable second.
3. Respect technical learners: markdown, precise language, no hand-holding.
4. Progress is honest and simple: one page, one completion state.
5. Sharing hands over a copy, never a dependency.
