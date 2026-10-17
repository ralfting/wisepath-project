# 14. Public and shared paths

Decided 2026-10-17. Not built yet. The rule it follows is in [security.md](../../.claude/rules/security.md), "Authorization".

## Why

Every path is private to its owner today. A learner wants to show a map to anyone (a public link) or to study it with
someone (sharing with an account, to read or to edit). The unit is the path: projects, the Inbox and review stay
private.

```
User 1──< Project 1──< Path >──< PathShare >── User
                        visibility: private | public
```

## The experience

- **Share** in the path's header (owner only) opens a dialog with two parts:
  - **Link:** "Private" or "Anyone with the link can read", and Copy link. Public means reachable by its link; it is
    never listed, and the page says `noindex`.
  - **People:** add by email, choose "Can read" or "Can edit", change or remove each person.
- **My paths** gains a "Shared with me" group after the projects, with the owner's name on each card. A shared path
  sits in no project of the viewer's, so its card has no "Move to..." and no Delete; "Leave" removes the share.
- **A reader** sees the map and its pages without the editor: no +, no N, no slash menu, no title edit, no Share.
- **An editor** edits pages like the owner, but cannot delete the path, move it, rename it, change its kind or share it.
- **A visitor without an account** opening a public link sees a read-only page, server-rendered, with "Sign up to make
  your own paths". Opening a private one answers not found, the same as a path that does not exist.
- **Studied marks** belong to the path today (`Page.studied`), so they are the owner's. Readers and editors see them
  and cannot change them. Progress per learner on a shared path is out of scope (see Open).

## How it works

- **Database** (one migration, after rebasing on `main`):
  - `paths.visibility` text, `'private' | 'public'`, not null, default `'private'`;
  - table `path_shares` (`path_id` -> paths, cascade; `user_id` -> users, cascade; `role` `'viewer' | 'editor'`;
    `created_at`), primary key `(path_id, user_id)`, index on `user_id`.
- **Domain** (`packages/domain/src/paths`):
  - `PathVisibility`, `ShareRole`, `PathAccess = 'owner' | 'editor' | 'viewer' | 'none'` as `Schema.Literals`;
  - `accessOf(path, viewer)`: owner is owner, a share gives its role, public gives viewer, else none; and
    `canEdit(access)`, `canManage(access)` (owner only). Unit tested, every case.
  - `PathSummary` and `Path` carry `access` and the owner's name; `PathShare` (user name, email, role);
  - commands `ShareEdit` (email, role), `VisibilityEdit`; errors `ShareTargetNotFound`, `CannotShareWithSelf`.
- **Contract** (`PathsApi`):
  - `get` and `list` answer for any path the viewer can read; `list` adds the shared ones.
  - The page commands (`createPage`, `updatePage`, `removePage`) need `editor`; `update`, `remove` and the new
    endpoints need `owner`. Without the access needed, the answer is `PathNotFound`, so a path's existence never leaks.
  - New: `GET /:pathId/shares`, `PUT /:pathId/shares` (email, role), `DELETE /:pathId/shares/:userId` (the owner, or
    the person leaving), `PATCH /:pathId/visibility`.
  - New group `PublicPathsApi`: `GET /api/public/paths/:pathId`, no session, read-only, `Path` without shares or emails.
- **API** (`apps/api/src/paths`):
  - `DrizzlePathStore`: `readableBy(userId)` and `editableBy(userId)` beside `ownedBy`; `listOwned` becomes
    `listReadable`; `get` takes the access it needs. The access is computed in the same query, not in a second one.
  - A test runs every combination (owner, editor, viewer, public, stranger) through the SQL and `accessOf` and checks
    they agree.
  - Sharing by email looks the user up; an unknown email answers `ShareTargetNotFound` to the owner only.
  - Search (`DrizzleSearchStore`) stays on the viewer's own paths in this plan.
- **Web**:
  - `useCases/paths`: `share`, `unshare`, `setVisibility` as Server Actions (`actions.ts`); `shares` read in the dialog.
  - `features/paths/path/ShareDialog/` with its view model; `features/paths/home` gets the "Shared with me" group.
  - The map and page read `path.access` and hide what it does not allow; the sync session (`useCases/paths/sync.ts`)
    sends no commands for a reader.
  - Public read: `app/public/paths/[pathId]/page.tsx`, a Server Component over a `queries.ts` read of
    `PublicPathsApi`, with `notFound()` and `generateMetadata` (`robots: noindex`). `middleware.ts` lets it through
    without a cookie. A logged-in reader of a public path they have no share for gets the same page.
  - Messages under `share.` in en and pt-BR.

## Steps (one commit each)

1. Domain: literals, `accessOf` and its tests, `access` on `Path` and `PathSummary`, share commands and errors.
2. Migration and schema: `visibility`, `path_shares`.
3. API: store predicates and the agreement test; `get`/`list` by access; page commands need editor.
4. API: share and visibility endpoints, public read endpoint, their integration tests.
5. Web: the map and page follow `access` (read-only mode), sync stays quiet for a reader.
6. Web: Share dialog and its actions; "Shared with me" on My paths, with Leave.
7. Web: public page, middleware, metadata.
8. Docs: `docs/FEATURES.md`, README endpoints.

## Checks

- Domain: `accessOf` for every combination of owner, share role and visibility.
- API, against the local database: a stranger gets `PathNotFound` on a private path for every endpoint; a viewer reads
  and cannot write pages; an editor writes pages and cannot rename, move, delete or share; only the owner changes
  visibility and shares; the public endpoint answers a public path without a session and `PathNotFound` for a private
  one; deleting a user or a path removes its shares; leaving a share works for the person, not for others.
- Web, Playwright (`e2e/`): the owner shares by email, the second account sees it under "Shared with me" and edits a
  page; a reader sees no editing; a public link opens logged out; turning it private makes it not found.
- axe clean on the dialog and the public page, light and dark; keyboard through the dialog.

## Open

- Progress per learner on a shared learning path (studied marks per user, not per page).
- Search over shared paths.
- Inviting an email with no account yet (today: it must exist).
- Copying a public path into your own projects ("Make a copy"), using `copyPath` from the domain.
