# 15. Reads on the server, mutations as Server Actions

Phase A done 2026-10-17; Phase B waits for Effect #8398. Finishes "Migration still open" in [architecture.md](../../.claude/rules/architecture.md) as far
as Effect allows today, and says what waits.

## Why

The target is that pages render with their data from the server and that discrete mutations are Server Actions, as
projects already are. Today:

| Surface | Reads | Mutations |
| --- | --- | --- |
| My paths (`app/paths/page.tsx`) | `usePaths`, `useProjects`, in the browser | Projects: Server Actions. Paths (create, move, delete, kind): atoms straight to the API |
| A map (`app/paths/[pathId]`) | The sync session, in the browser; `PathGate` decides not found there, so a missing map answers 200 | The sync session (stays: [react-next.md](../../.claude/rules/react-next.md)) |
| A full page (`pages/[pageId]`) | Same as the map | Same |
| Sidebar, rail, search, page picker | `usePaths`, in the browser | - |
| Inbox | `useInbox`, in the browser | Capture and discard: atoms, optimistic |
| Public path | Server (plan 14) | Take: Server Action |

## What blocks the rest

Server data can't seed the client's atoms yet: a hydrated atom with `withReactivity` runs its effect again right
after hydration ([Effect #8398](https://github.com/Effect-TS/effect/issues/8398), still open on 2026-10-17). Every
list here is an atom read by several screens at once (the paths list feeds the home, the sidebar, the rail, search
and the page picker). Reading it on the server as props for one screen would give two copies of the same list,
refreshed by different means, that can disagree on screen. So server reads of shared lists wait for #8398.

## Phase A: now

1. **A missing map answers 404.** `app/paths/[pathId]/layout.tsx` reads the map's access on the server
   (`useCases/paths/queries.ts`, a `pathAccess` query beside `pathTitle`, deduped by React `cache`) and calls
   `notFound()` when the learner may not read it. `PathGate` keeps its client check for a map removed while open.
   The page route gets the same through the layout. Test: e2e, a stranger's and an unknown map answer 404.
2. **Path mutations become Server Actions**, as projects' are: `createPath`, `movePath`, `removePath` and
   `setPathKind` (for a map that isn't open) in `useCases/paths/actions.ts`, each through `runAction` and
   `revalidatePath(HOME)`. The hooks keep their names and signatures, wrap the action with `useAction` and
   invalidate `ReactivityKeys.paths`; `useMovePath` keeps its optimistic move and Undo. Component tests mock the
   actions (testing.md); e2e covers create, move and delete surviving a reload.
3. **The Inbox stays on atoms**, by decision: capture and discard are optimistic and fire and forget, and the fix
   for BUG-001 (a capture lost on a slow connection) depends on the atom living in a container that stays
   mounted. A Server Action per capture adds a hop through Next and would need that bug solved again. Recorded in
   architecture.md as settled, not as migration left.
4. **Rules:** architecture.md's "Migration still open" lists only what waits on #8398; react-next.md's table says
   path mutations are actions.

## Phase B: when Effect #8398 is fixed

- The paths list, projects and the Inbox are read in `queries.ts` and passed to the client as the atoms' initial
  values (`Atom.initialValue`), so the home, sidebar, search and Inbox render with data and no second request.
- The map's sync session opens from the server's copy of the path instead of reading it again.
- Check the issue before starting; drop the "No atom hydration yet" note in effect.md once done.

## Steps (one commit each)

1. `pathAccess` query and the layout's `notFound()`, with the e2e for 404.
2. Path Server Actions and the hooks over them, with their tests.
3. Rules and docs: architecture.md, react-next.md, this plan's status.

## Checks

- A missing or someone else's map answers 404 on a full load, and its tab title stays the generic one.
- Creating, moving (with Undo) and deleting a path show at once and survive a reload; a move the API refuses goes
  back. The sidebar and search follow without a reload.
- Typecheck, lint, all tests, build, e2e.
