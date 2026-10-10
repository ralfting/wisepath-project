# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: technical learners comfortable with markdown — developers, plus people learning data, design tooling and similar technical subjects. They are studying a topic on their own (e.g. "Learn Javascript"), pulling from scattered videos, docs, articles and books, and need one place to keep what they found and how it fits together.

Secondary: followers who receive a copy of someone else's path and work through it with their own progress. Authoring comes first; following is a bonus, not the main entry point.

## Product Purpose

WisePath lets a learner document the exact path they took to learn something: a project (topic) broken into pages (subtopics), each with a markdown description, resources and notes, connected to each other to show how the concepts relate. Learners mark pages complete as they study and can share the whole path.

Success: a learner can come back months later — or hand the path to someone else — and recreate the journey: what to study, in what order, from which resources, and why the pieces connect.

## Positioning

The connections between concepts are treated as being as valuable as the resources themselves. Paths are graphs, not folders or linear courses, and the same structure is viewable as a mindmap (exploration) or an ordered list (sequential study). It is a personal learning notebook that happens to be shareable, not a course platform or a bookmark manager.

## Operating Context

Typical workflow:
1. Start learning something new.
2. Create a project for it.
3. Break the topic into pages ("Closures", "Promises", "Async/Await").
4. For each page, write the concept in markdown and add resources (links, YouTube embeds, notes).
5. Connect pages to show relationships and learning order.
6. Mark pages complete while studying.
7. Share the finished path; the recipient gets an independent copy.

Used in a desktop browser alongside the material being studied (video, docs, IDE), often over many sessions.

## Capabilities and Constraints

- Accounts: email/password sign up, log in, persistent session, log out (Phase 1, in progress).
- Projects (topics) and pages (subtopics); page content in markdown with preview; inline YouTube embeds.
- Pages connect as a graph, not a hierarchy. Views: mindmap and list (ordered by connections), both reorderable via drag and drop.
- Progress is tracked per page only, not per resource.
- Sharing creates a full independent copy; each user owns their own copy and progress.
- Out of scope for v1: real-time collaboration, nested page hierarchy, built-in templates, social features (likes, comments on others' projects), mobile apps.
- Stack: Turborepo monorepo — Next.js 14 + Tailwind + shadcn/ui (`apps/web`), NestJS + Prisma (`apps/api`), shared types (`packages/types`).
- Terminology: "project" = topic, "page" = subtopic, "connection" = link between pages, "path" = a project's connected pages as a learning journey.
- Undecided: AI features. The repo name says "WisePath AI", but no AI capability is defined; do not imply one.

## Brand Commitments

- User-facing name is **WisePath** (no "AI" suffix for now).
- No logo, voice guide or visual identity committed yet.

## Evidence on Hand

None. No users, testimonials, metrics, example paths or screenshots exist yet. Do not fabricate them; demo content must read as sample content.

## Product Principles

1. The path is the product: structure and connections between concepts matter as much as the resources.
2. The author owns their journey — a personal notebook first, shareable second.
3. Respect technical learners: markdown, precise language, no hand-holding.
4. Progress is honest and simple: one page, one completion state.
5. Sharing hands over a copy, never a dependency.
