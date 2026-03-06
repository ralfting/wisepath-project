# Requirements: WisePath AI

**Defined:** 2025-03-06
**Core Value:** Users can document the exact path they took to learn something and share that structured knowledge journey with others

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can log in with email and password
- [ ] **AUTH-03**: User can log in with Google OAuth
- [ ] **AUTH-04**: User can log in with GitHub OAuth
- [ ] **AUTH-05**: User session persists across browser refresh
- [ ] **AUTH-06**: User can log out from any page

### Project Management

- [ ] **PROJ-01**: User can create a new learning project with title
- [ ] **PROJ-02**: User can view list of their projects
- [ ] **PROJ-03**: User can open a project to view its pages
- [ ] **PROJ-04**: User can edit project title
- [ ] **PROJ-05**: User can delete a project
- [ ] **PROJ-06**: User can share project via link (creates copy for recipient)
- [ ] **PROJ-07**: User can make project public (appears in project gallery)
- [ ] **PROJ-08**: User can browse public project gallery
- [ ] **PROJ-09**: User can view public project in read-only mode
- [ ] **PROJ-10**: User can copy a public project to their account (full edit access on copy)

### Page Management

- [ ] **PAGE-01**: User can create a new page within a project
- [ ] **PAGE-02**: User can write page title
- [ ] **PAGE-03**: User can write page description using markdown editor with live preview
- [ ] **PAGE-04**: User can add resources/references using markdown editor
- [ ] **PAGE-05**: Markdown editor supports headers, bold, italic, links, lists
- [ ] **PAGE-06**: Markdown editor supports image uploads and embeds
- [ ] **PAGE-07**: Markdown editor supports YouTube video embeds (inline player)
- [ ] **PAGE-08**: Markdown editor supports Vimeo video embeds (inline player)
- [ ] **PAGE-09**: Markdown editor supports code blocks with syntax highlighting
- [ ] **PAGE-10**: Markdown editor supports tables
- [ ] **PAGE-11**: User can edit existing page content
- [ ] **PAGE-12**: User can delete a page
- [ ] **PAGE-13**: User can mark page as complete
- [ ] **PAGE-14**: User can unmark page as complete
- [ ] **PAGE-15**: Page shows completion status visually

### Graph Connections

- [ ] **CONN-01**: User can create connection from one page to another
- [ ] **CONN-02**: User can delete connection between pages
- [ ] **CONN-03**: User can navigate from one page to another via connections
- [ ] **CONN-04**: Pages can have multiple incoming and outgoing connections

### Visualization

- [ ] **VIZ-01**: User can view project pages as mindmap graph
- [ ] **VIZ-02**: User can view project pages as ordered list
- [ ] **VIZ-03**: User can toggle between mindmap and list views
- [ ] **VIZ-04**: Mindmap allows zoom and pan
- [ ] **VIZ-05**: Mindmap shows page titles and completion status
- [ ] **VIZ-06**: User can click page in mindmap to open it
- [ ] **VIZ-07**: User can drag pages to reorganize in mindmap view
- [ ] **VIZ-08**: User can create/edit connections by dragging in mindmap
- [ ] **VIZ-09**: List view shows pages in order based on connections
- [ ] **VIZ-10**: User can drag pages to reorder in list view

### Progress Tracking

- [ ] **PROG-01**: User sees percentage of completed pages per project
- [ ] **PROG-02**: User sees count of completed pages per project
- [ ] **PROG-03**: User sees visual progress indicator on project card
- [ ] **PROG-04**: Each user has independent progress on copied projects

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Collaboration

- **COLLAB-01**: User can invite others to co-edit a project (real-time)
- **COLLAB-02**: User can leave comments on pages
- **COLLAB-03**: User can see who else is viewing/editing

### Enhanced Discovery

- **DISC-01**: User can search public projects by topic/tags
- **DISC-02**: User can rate/review public projects
- **DISC-03**: User can follow other users
- **DISC-04**: User sees recommended projects based on interests

### Export & Integration

- **EXPORT-01**: User can export project as PDF
- **EXPORT-02**: User can export project as markdown files
- **EXPORT-03**: User can import from existing markdown/notes apps

### Mobile

- **MOBILE-01**: Responsive mobile web interface
- **MOBILE-02**: Native mobile apps (iOS/Android)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time collaboration | High complexity, conflicts with "each user owns their journey" model |
| Nested page hierarchies | Using graph structure instead — more flexible for learning paths |
| Built-in video hosting | Use embeds from existing platforms (YouTube, Vimeo) |
| Custom domains for projects | Not core to learning journey documentation |
| AI-generated content suggestions | Focus on user-curated content first |
| Time tracking per page | Page-level completion is sufficient for v1 |
| Spaced repetition system | Different product focus — we're documenting journeys, not flashcards |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| PROJ-01 | Phase 2 | Pending |
| PROJ-02 | Phase 2 | Pending |
| PROJ-03 | Phase 2 | Pending |
| PROJ-04 | Phase 2 | Pending |
| PROJ-05 | Phase 2 | Pending |
| PROJ-06 | Phase 4 | Pending |
| PROJ-07 | Phase 4 | Pending |
| PROJ-08 | Phase 4 | Pending |
| PROJ-09 | Phase 4 | Pending |
| PROJ-10 | Phase 4 | Pending |
| PAGE-01 | Phase 2 | Pending |
| PAGE-02 | Phase 2 | Pending |
| PAGE-03 | Phase 2 | Pending |
| PAGE-04 | Phase 2 | Pending |
| PAGE-05 | Phase 2 | Pending |
| PAGE-06 | Phase 2 | Pending |
| PAGE-07 | Phase 2 | Pending |
| PAGE-08 | Phase 2 | Pending |
| PAGE-09 | Phase 2 | Pending |
| PAGE-10 | Phase 2 | Pending |
| PAGE-11 | Phase 2 | Pending |
| PAGE-12 | Phase 2 | Pending |
| PAGE-13 | Phase 2 | Pending |
| PAGE-14 | Phase 2 | Pending |
| PAGE-15 | Phase 2 | Pending |
| CONN-01 | Phase 3 | Pending |
| CONN-02 | Phase 3 | Pending |
| CONN-03 | Phase 3 | Pending |
| CONN-04 | Phase 3 | Pending |
| VIZ-01 | Phase 3 | Pending |
| VIZ-02 | Phase 3 | Pending |
| VIZ-03 | Phase 3 | Pending |
| VIZ-04 | Phase 3 | Pending |
| VIZ-05 | Phase 3 | Pending |
| VIZ-06 | Phase 3 | Pending |
| VIZ-07 | Phase 3 | Pending |
| VIZ-08 | Phase 3 | Pending |
| VIZ-09 | Phase 3 | Pending |
| VIZ-10 | Phase 3 | Pending |
| PROG-01 | Phase 4 | Pending |
| PROG-02 | Phase 4 | Pending |
| PROG-03 | Phase 4 | Pending |
| PROG-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0 ✓

---
*Requirements defined: 2025-03-06*
*Last updated: 2025-03-06 after initial definition*
