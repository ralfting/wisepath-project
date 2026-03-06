# Roadmap: WisePath AI

**Created:** 2025-03-06
**Granularity:** Coarse (3-5 phases, critical path only)
**Coverage:** 49/49 v1 requirements mapped ✓

## Phases

- [ ] **Phase 1: Foundation & Auth** - Users can securely access their accounts
- [ ] **Phase 2: Core Content** - Users can create and manage learning projects with markdown pages
- [ ] **Phase 3: Graph & Visualization** - Users can connect pages and visualize learning paths
- [ ] **Phase 4: Sharing & Discovery** - Users can share projects and track progress

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 0/6 | Not started | - |
| 2. Core Content | 0/? | Not started | - |
| 3. Graph & Visualization | 0/? | Not started | - |
| 4. Sharing & Discovery | 0/? | Not started | - |

## Phase Details

### Phase 1: Foundation & Auth

**Goal:** Users can securely access their accounts and the application infrastructure is ready

**Depends on:** Nothing (first phase)

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06

**Success Criteria** (what must be TRUE):
1. User can sign up with email and password
2. User can log in with email/password, Google OAuth, or GitHub OAuth
3. User stays logged in across browser refresh
4. User can log out from any page
5. Application is deployed and accessible via web browser

**Plans:** 6 plans

Plans:
- [ ] 01-01-PLAN.md — Establish Turborepo monorepo foundation with Next.js, NestJS, and shared types
- [ ] 01-02-PLAN.md — Set up NestJS backend with Prisma ORM and authentication module foundation
- [ ] 01-03-PLAN.md — Set up Next.js frontend with Tailwind, shadcn/ui, and authentication pages
- [ ] 01-04-PLAN.md — Implement email/password authentication with JWT and persistent sessions
- [ ] 01-05-PLAN.md — Implement Google and GitHub OAuth authentication
- [ ] 01-06-PLAN.md — Deploy application to production (Vercel + Render)

---

### Phase 2: Core Content

**Goal:** Users can create learning projects, add pages with markdown content, and manage their learning materials

**Depends on:** Phase 1 (need authentication to own projects)

**Requirements:** PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, PAGE-01, PAGE-02, PAGE-03, PAGE-04, PAGE-05, PAGE-06, PAGE-07, PAGE-08, PAGE-09, PAGE-10, PAGE-11, PAGE-12, PAGE-13, PAGE-14, PAGE-15

**Success Criteria** (what must be TRUE):
1. User can create, view, edit, and delete learning projects
2. User can create pages within projects with titles
3. User can write page descriptions and resources using markdown editor with live preview
4. Markdown editor supports full formatting: headers, bold, italic, links, lists, images, videos (YouTube/Vimeo), code blocks, tables
5. User can mark pages as complete/incomplete with visual indication

**Plans:** TBD

---

### Phase 3: Graph & Visualization

**Goal:** Users can connect pages to show learning paths and visualize their project structure as mindmap or list

**Depends on:** Phase 2 (need pages to connect and visualize)

**Requirements:** CONN-01, CONN-02, CONN-03, CONN-04, VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05, VIZ-06, VIZ-07, VIZ-08, VIZ-09, VIZ-10

**Success Criteria** (what must be TRUE):
1. User can create and delete connections between pages
2. User can navigate between connected pages
3. User can toggle between mindmap and list views
4. Mindmap view shows interactive graph with zoom, pan, and displays page titles and completion status
5. User can drag pages to reorganize and create connections in mindmap view
6. List view shows pages ordered by connections with drag-to-reorder capability

**Plans:** TBD

---

### Phase 4: Sharing & Discovery

**Goal:** Users can share their learning journeys with others and discover public projects, with independent progress tracking

**Depends on:** Phase 3 (need complete project experience before sharing)

**Requirements:** PROJ-06, PROJ-07, PROJ-08, PROJ-09, PROJ-10, PROG-01, PROG-02, PROG-03, PROG-04

**Success Criteria** (what must be TRUE):
1. User can share project via link that creates a full copy for recipient
2. User can make project public and it appears in project gallery
3. User can browse public projects and view them in read-only mode
4. User can copy a public project to their account with full edit access
5. Each project shows progress percentage, completed page count, and visual progress indicator
6. Each user has independent progress on their own and copied projects

**Plans:** TBD

---

## Notes

**Granularity rationale:** Coarse setting applied - compressed to 4 critical delivery boundaries:
- Phase 1: Foundation (must happen first)
- Phase 2: Core content creation (the heart of the product)
- Phase 3: Graph visualization (unique differentiator)
- Phase 4: Sharing multiplayer effect (network value)

**Dependencies:** Linear progression - each phase builds on the previous. Cannot visualize graphs without pages, cannot share without complete project experience.

**Coverage:** All 49 v1 requirements mapped to exactly one phase.

---
*Last updated: 2025-03-06*
