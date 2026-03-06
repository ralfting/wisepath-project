# WisePath AI

## What This Is

A web platform for documenting and sharing learning journeys. Users create learning projects (topics like "Learn Javascript"), organize them as connected pages (subtopics like "Closures", "Promises"), add resources and notes in markdown, track their progress, and share complete learning paths with others who can then follow the same journey with their own progress tracking.

## Core Value

Users can document the exact path they took to learn something and share that structured knowledge journey with others, preserving both the resources and the connections between concepts.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can create an account and log in
- [ ] User can create learning projects (topics)
- [ ] User can create pages within projects (subtopics)
- [ ] User can write page descriptions in markdown with preview
- [ ] User can add references/resources to pages using markdown editor
- [ ] User can embed videos inline (YouTube)
- [ ] User can connect pages in a graph structure
- [ ] User can visualize pages as a mindmap
- [ ] User can view pages as a list (ordered by connections)
- [ ] User can reorganize pages (drag and drop in both views)
- [ ] User can mark pages as complete (progress tracking)
- [ ] User can share a project (creates full copy for another user)
- [ ] Each user has independent progress on their own/copied projects

### Out of Scope

- Real-time collaboration — each project belongs to one user, sharing creates independent copies
- Hierarchical page structure — using graph/connections instead of nested folders
- Built-in templates — users start with empty projects, build their own structure
- Per-reference progress tracking — tracking at page level only
- Social features (likes, comments on others' projects) — focus is on knowledge structure
- Mobile app — web-first for v1

## Context

**Learning problem:** When studying a topic, people accumulate resources (videos, articles, books, notes) but lose the context of how they're connected and the order that made sense for learning. Later, they can't recreate or share their learning path.

**User workflow:**
1. Start learning something new (e.g., "Javascript")
2. Create project in WisePath
3. Break topic into pages (subtopics): "Closures", "Promises", "Async/Await"
4. For each page: write description of concept + add resources (videos, articles, notes)
5. Connect pages to show relationships/learning path
6. Mark pages complete as they study
7. Share complete learning path with others

**Key insight:** The connections between concepts are as valuable as the resources themselves. A mindmap view makes these connections visible and navigable.

## Constraints

- **Tech stack**: Web application (no mobile app for v1) — maximize accessibility through browsers
- **Timeline**: MVP should capture core learning journey workflow — projects, pages, markdown, graph visualization, sharing
- **Complexity**: Graph visualization and markdown editor with embeds are technically challenging — need solid libraries
- **User experience**: Markdown familiarity assumed — target audience is technical learners comfortable with markdown

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Graph structure over hierarchy | Learning paths aren't strictly linear; concepts interconnect in complex ways | — Pending |
| Markdown for all content | Flexible, familiar to target users, supports embeds via extensions | — Pending |
| Page-level progress only | Simpler UX; page represents atomic learning unit | — Pending |
| Sharing = full copy | Simpler than permissions; each user owns their learning journey | — Pending |
| Mindmap + list views | Different views for different needs: exploration vs. sequential study | — Pending |

---
*Last updated: 2025-03-06 after initialization*
