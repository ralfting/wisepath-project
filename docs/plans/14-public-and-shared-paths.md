# 14. Public and shared paths

Decided 2026-10-17. Not built yet. The rule it follows is in [security.md](../../.claude/rules/security.md), "Authorization".

## Why

Every path is private to its owner today. A learner wants to show a map to anyone (a public link) or to study it with
someone (sharing with an account, to read or to edit). The unit is the path: projects, the Inbox and review stay
private.

Two principles, from the user:

- **Progress is yours.** Each learner sees only their own studied marks, on their own paths and on everyone else's.
  Nobody sees another learner's progress, the owner included.
- **You can take a path to study, never make it yours.** Taking a public path adds it to your paths to study it with
  your own progress; the content stays the owner's, follows their edits and goes away if they make it private or
  delete it. There is no copy: no "Make a copy", no clone, no way to republish someone else's path.

```
User 1──< Project 1──< Path >──< PathMember >── User     (invited: viewer | editor, or taken: viewer)
                        visibility: private | public
User 1──< PageProgress >── Page                          (studied marks, per learner)
```

## The experience

- **Share** in the path's header (owner only) opens a dialog with two parts:
  - **Link:** "Private" or "Anyone with the link can read", and Copy link. Public means reachable by its link; it is
    never listed, and the page says `noindex`.
  - **People:** add by email, choose "Can read" or "Can edit", change or remove each person.
- **Taking a public path:** a logged-in reader of a public path they are not a member of sees "Study this path". It
  adds the path to their paths as a reader; their marks start empty.
- **My paths** gains a "From others" group after the projects: paths shared with you and paths you took, with the
  owner's name on each card. They sit in no project of yours, so their cards have no "Move to..." and no Delete;
  "Leave" removes them (your progress on it goes too).
- **A reader** sees the map and its pages without the editor: no +, no N, no slash menu, no title edit, no Share.
  They do mark pages studied and use "Continue studying": that is their progress, not an edit of the path.
- **An editor** edits pages like the owner, but cannot delete the path, move it, rename it, change its kind or share it.
- **A visitor without an account** opening a public link sees a read-only page, server-rendered, with "Sign up to make
  your own paths". Opening a private one answers not found, the same as a path that does not exist.
- **Studied marks** are per learner, for everyone. The owner's marks today move to them unchanged. The Share dialog
  lists the people invited, never their progress, and never who took a public path.
- **Turning a path private** removes the people who took it (and their marks on it); invited people stay.

## How it works

- **Database** (one migration, after rebasing on `main`):
  - `paths.visibility` text, `'private' | 'public'`, not null, default `'private'`;
  - table `path_members` (`path_id` -> paths, cascade; `user_id` -> users, cascade; `role` `'viewer' | 'editor'`;
    `source` `'invited' | 'taken'`; `created_at`), primary key `(path_id, user_id)`, index on `user_id`;
  - table `page_progress` (`user_id` -> users, cascade; `page_id` -> pages, cascade; `studied_at`), primary key
    `(user_id, path_id, page_id)`; filled from `pages.studied` with each path's owner. `pages.studied` is dropped in
    a later release (step 10).
- **Domain** (`packages/domain/src/paths`):
  - `PathVisibility`, `ShareRole`, `PathAccess = 'owner' | 'editor' | 'viewer' | 'none'` as `Schema.Literals`;
  - `accessOf(path, viewer)`: owner is owner, a membership gives its role, public gives viewer, else none; and
    `canEdit(access)`, `canManage(access)` (owner only). Unit tested, every case.
  - `PathSummary` and `Path` carry `access` and the owner's name; `PathShare` (user name, email, role), invited only;
  - `Page.studied` keeps its name and now means "studied by whoever reads it"; the domain rules over it
    (`progressOf`, `nextToStudy`) do not change;
  - commands `ShareEdit` (email, role), `VisibilityEdit`; errors `ShareTargetNotFound`, `CannotShareWithSelf`.
- **Contract** (`PathsApi`):
  - `get` and `list` answer for any path the viewer can read; `list` adds the shared ones.
  - The page commands (`createPage`, `updatePage`, `removePage`) need `editor`, except an `updatePage` that only
    changes `studied`: it needs `viewer` and writes the caller's `page_progress`, so the web sync keeps sending the
    same command. `update`, `remove`, shares and visibility need `owner`. Without the access needed, the answer is
    `PathNotFound`, so a path's existence never leaks.
  - New: `GET /:pathId/shares`, `PUT /:pathId/shares` (email, role), `DELETE /:pathId/shares/:userId` (the owner, or
    the person leaving), `PATCH /:pathId/visibility`, `POST /:pathId/take` (a public path, for a logged-in non-member).
  - No endpoint copies a path that is not the caller's.
  - New group `PublicPathsApi`: `GET /api/public/paths/:pathId`, no session, read-only, `Path` without shares or emails.
- **API** (`apps/api/src/paths`):
  - `DrizzlePathStore` reads each path with its owner, visibility, the reader's membership and marks in one query,
    and sets `access` with `accessOf`: one implementation of the rule, no SQL twin to keep in agreement.
    `listOwned` becomes `listFor` (own paths and those the reader is a member of). Each use case states what it
    needs (`reads`, `edits`, `manages`).
  - Sharing by email looks the user up; an unknown email answers `ShareTargetNotFound` to the owner only.
  - Search (`DrizzleSearchStore`) stays on the viewer's own paths in this plan.
- **Web**:
  - `useCases/paths`: `share`, `unshare`, `setVisibility` as Server Actions (`actions.ts`); `shares` read in the dialog.
  - `features/paths/path/ShareDialog/` with its view model; `features/paths/home` gets the "Shared with me" group.
  - The map and page read `path.access` and hide what it does not allow; the sync session (`useCases/paths/sync.ts`)
    sends only studied marks for a reader.
  - "Study this path" on the public page when logged in, through a `take` Server Action.
  - Public read: `app/public/paths/[pathId]/page.tsx`, a Server Component over a `queries.ts` read of
    `PublicPathsApi`, with `notFound()` and `generateMetadata` (`robots: noindex`). `middleware.ts` lets it through
    without a cookie. A logged-in reader of a public path they have no share for gets the same page.
  - Messages under `share.` in en and pt-BR.

## Steps (one commit each)

1. Progress per learner, alone, before any sharing: `page_progress`, the owner's marks moved into it, the store
   reads and writes them. Nothing changes for anyone yet; it is the riskiest migration, so it ships by itself.
2. Domain: literals, `accessOf` and its tests, share commands and errors.
3. Migration and schema: `visibility`, `path_members`.
4. API: access read with the path; `access` on `Path` and `PathSummary`; `get`/`list` by access; page commands need editor, studied needs viewer.
5. API: share, visibility and take endpoints, public read endpoint, their integration tests.
6. Web: the map and page follow `access` (read-only mode, own marks still work).
7. Web: Share dialog and its actions; "From others" on My paths, with Leave.
8. Web: public page, Study this path, middleware, metadata.
9. Docs: `docs/FEATURES.md`, README endpoints.
10. Once step 1 is deployed: a migration that drops `pages.studied` ([nest.md](../../.claude/rules/nest.md): never drop in the
    release that stops reading it). Until then, rolling the API back to before step 1 shows each owner the marks
    `pages.studied` had at the migration: marks made since live only in `page_progress`.

## Checks

- Migration on a copy of the data: every studied mark ends as its path owner's `page_progress`, none lost.
- Domain: `accessOf` for every combination of owner, member role and visibility.
- API, against the local database: a stranger gets `PathNotFound` on a private path for every endpoint; a viewer reads
  and cannot write pages; an editor writes pages and cannot rename, move, delete or share; only the owner changes
  visibility and shares; the public endpoint answers a public path without a session and `PathNotFound` for a private
  one; deleting a user or a path removes its members; leaving works for the person, not for others.
- Progress: two learners on one path mark different pages and each reads only their own; the owner's list of shares
  carries no marks and no takers; turning a path private removes its takers and their marks; a viewer's `studied`
  edit changes no page for anyone else; an `updatePage` with `studied` and `content` from a viewer is refused whole.
- Web, Playwright (`e2e/`): the owner shares by email, the second account sees it under "From others" and edits a
  page; a reader sees no editing but marks a page studied, which the owner does not see; a public link opens logged
  out; a second account takes it and studies; turning it private makes it not found.
- axe clean on the dialog and the public page, light and dark; keyboard through the dialog.

## Open

- Sharing by email answers `ShareTargetNotFound` for an email with no account, so it tells whether one is registered.
  Accepted: signup already does (`EmailAlreadyRegistered`).
- ~~Search over paths from others.~~ Done 2026-10-17: search covers the paths a learner has, their own and those they are a member of.
- Inviting an email with no account yet (today: it must exist).
- Telling a taker that the path went private or was deleted (today it just leaves their list).
