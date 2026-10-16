# 12. Projects group paths

Decided 2026-10-16.

## Why

A learner's paths sat in one flat list. Projects group them: "Work", "Languages", "General". A path belongs to a project, and a project to a user; the user has no direct tie to a path any more.

```
User 1──< Project 1──< Path 1──< Page
```

Projects are not shared: one owner, no members or roles.

## The experience

- **My paths** shows one group per project: the default project first, then the others by name. An empty project still shows, with its own "+ New path".
- **The default project** is made with the account, named "General" ("Geral" in pt-BR, by the account's language). It carries a "Default" badge, can be renamed, and cannot be deleted.
- **A project has a name only.** Its group header has a ⋯ menu: Rename, Delete. "New project" sits beside "New path".
- **Deleting a project** moves its paths to the default project; nothing is lost.
- **New path:** the global button opens the dialog with a Project field set to the default project; a group's "+ New path" opens it set to that project. Either way it can be changed.
- **Moving a path:** "Move to…" in the path card's ⋯ menu lists the projects.
- The search box on the page filters paths across all groups and hides groups left empty by the filter.

## Naming: what was "project" becomes "path"

The code called a path a "project" (`projects` table, `ProjectId`, `/projects/:id`). The new grouping takes that name, so the old one is renamed first, everywhere:

| Before | After |
| --- | --- |
| table `projects`, columns `project_id` | `paths`, `path_id` |
| `Project`, `ProjectId`, `ProjectKind`, `ProjectStore`, `useProject`… | `Path`, `PathId`, `PathKind`, `PathStore`, `usePath`… |
| `/api/projects`, `/projects/:id` | `/api/paths`, `/paths/:id` |

The page trail from the root, `pathTo` in `tree.ts`, becomes `trailTo` so "path" keeps one meaning. Old web URLs (`/projects`, `/projects/:id/...`) redirect to the new ones in `middleware.ts`, so saved links keep working.

The interface text already says "path"/"trilha"; it gains "Project"/"Projeto".

## How it works

- **Database** (one migration, hand-written over `drizzle-kit generate --custom` so the snapshot follows):
  - rename `projects` → `paths`, `project_id` → `path_id` (pages, review_states), and their constraints and indexes;
  - new table `projects` (`id`, `owner_id` → User, `name`, `is_default`, `created_at`), with a partial unique index: one default per owner;
  - `paths.project_id` → projects, `NOT NULL`; each user gets a default project and their paths move into it; then `paths.owner_id` is dropped.
  - This breaks "migrations only add": accepted, about a minute of errors while the old API runs against the new schema.
- **Domain** (`packages/domain/src/projects`, new): `Project`, `ProjectId`, `NewProject`, `ProjectEdit`, errors `ProjectNotFound` and `DefaultProjectProtected`; ordering rule (default first, then by name).
- **Contract:** `ProjectsApi` under `/api/projects`: list, create, rename, delete (moves paths to the default). `PathsApi`: `NewPath` gains `projectId` (default project when absent); `PathEdit` gains `projectId` (move); `PathSummary` carries `projectId`.
- **API:** ownership of a path is checked through its project's owner. Signup creates the default project, named by the account's language; the sample map goes into it.
- **Web:** `ProjectsHome` groups by project; project dialogs (new, rename, delete); Project select in the new path dialog; "Move to…" in the card menu; messages in en and pt-BR.

## Steps (one commit each)

1. Rename project → path across domain, contract, API, web, tests and routes; DB names stay until step 2.
2. Migration and schema: rename the tables, add projects, move paths in.
3. Domain and contract for projects; path commands take a project.
4. API: projects endpoints, default project at signup, ownership through projects.
5. Web: grouped home, project dialogs, project select, move to.
6. Old URL redirects; docs (README, FEATURES).

## Checks

- Typecheck, lint, all tests; API integration tests for: list/create/rename/delete projects, deleting moves paths to the default, the default cannot be deleted, another user's project answers ProjectNotFound, a path created without a project lands in the default, moving a path.
- Migration on a copy of the data: every path ends in its owner's default project, no path lost.
- Browser: groups and order, badge, new path from both places, move to, rename, delete with paths, old `/projects/:id` link redirects.
