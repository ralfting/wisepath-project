---
paths:
  - "apps/web/app/**"
  - "apps/web/**/*.tsx"
  - "apps/web/useCases/**/queries.ts"
  - "apps/web/useCases/**/actions.ts"
  - "apps/web/middleware.ts"
---

# React and Next.js (App Router, Next 15, React 19)

Target: get the most from Server Components. Reads render on the server, discrete mutations are Server Actions, and
only interactive leaves are client components. Today most screens are client-only; follow the target for new code
and when a change is already rewriting a screen ([architecture.md](architecture.md), "Migration still open").

## Who does what

| Operation | Mechanism |
|---|---|
| First render data: paths list, projects, inbox, a map, a page, the session | Server Component calling `useCases/<domain>/queries.ts` |
| Tab title, `notFound()`, `redirect()` | Server: `generateMetadata` and the page, through the same queries |
| Discrete mutation: project CRUD, create/delete path, file/discard inbox item | Server Action in `useCases/<domain>/actions.ts` |
| Session: login, signup, logout, account language | Client atoms in `useCases/auth/session.ts`, straight to the API |
| Continuous map editing (commands, offline queue, 400 ms debounce) | Client atoms in `useCases/paths/sync.ts`, straight to the API |
| Pure interaction: palettes, drawer, editor, mind map, keyboard | Client component, as deep in the tree as possible |

**Why the session stays client-side:** the browser reaches the API on the same origin (the `/api` rewrite in
production, the same host in dev), so the API's `Set-Cookie` lands where the next server read needs it. As Server
Actions they would add a hop and copy cookies by hand, and their tests could no longer swap services through Layers.

**Why the editor stays client-side:** each keystroke becomes a command applied locally and sent in order with retry
while offline; a Server Action per command adds a hop through Next and loses the offline queue.

## Server/client boundary

- Every file is a Server Component unless it needs state, effects, event handlers or browser APIs.
- `'use client'` goes on the smallest leaf that needs it. Pass server-fetched data down as props; pass server-only
  UI to a client component as `children`.
  ```tsx
  // Wrong: the whole page becomes client to toggle one menu
  'use client';
  export default function PathsPage() { const [open, setOpen] = useState(false); ... }
  // Right
  export default async function PathsPage() {
    const paths = await listPaths();
    return <PathsHome paths={paths} actions={<NewPathMenu />} />;   // NewPathMenu is the only 'use client'
  }
  ```
- A Server Component uses only flat Mantine components; a compound member (`Grid.Col`, `Menu.Item`, `Card.Section`)
  needs `'use client'`. **Why:** on the server the import is a client reference without those properties, so the
  member is `undefined` and the segment fails (BUG-004).
- Props crossing to a client component are serializable: no functions (except Server Actions), no class instances.
  Domain `Schema.Class` values (`User`) cross as their encoded form.
- `queries.ts` and `infrastructure/server/*` start with `import 'server-only'`. Actions start with `'use server'` and
  export only async functions.

## Routes (`app/`)

- `page.tsx`/`layout.tsx` stay thin: await and decode `params`, call queries, render a feature. No `fetch`, no Effect,
  no business rules.
- `params` and `searchParams` are Promises in Next 15: `const { pathId } = await params`.
- Every segment that loads data has `error.tsx` (`'use client'`, translated message, retry with `reset`). Missing
  resources call `notFound()` and render the segment's `not-found.tsx`. **Why:** today `PathGate` decides not-found in
  the browser, so the server answers 200 for a missing map.
- `loading.tsx` (a skeleton matching the final layout) only where the read is slow enough to show one. Never on a
  public or indexable route that can be missing (`app/public/**`): it streams the page, so the status is sent before
  `notFound()` runs and a missing page answers 200 (with `noindex`) instead of 404. That is Next's documented
  streaming behaviour, not a bug of ours.
- Parallel `@drawer` + intercepting `(.)pages/[pageId]` open a page over the map; a direct load renders the full page.
  Navigate to another path's page with `mapWithPageHref`, never `pageHref` (see the comment in `routes.ts`).
- `middleware.ts` only redirects (legacy URLs, logged-in users away from /login). It never decides access.

## Server reads

- A query is a `cache(async (...) => ...)` in `useCases/<domain>/queries.ts` that decodes its input, runs a program
  with `runServer` and maps the `Exit` to what the page needs. React `cache` dedupes calls within one render
  (layout + page + metadata). Model: `pathTitle` in `useCases/paths/queries.ts`, used by
  `app/paths/[pathId]/page.tsx`'s `generateMetadata`.
- Queries send the request's cookies, and the API checks the session ([security.md](security.md)); pages never
  pass a user id in.
- Server data reaches client components as props, not hydrated atoms ([effect.md](effect.md), "Reactivity and cache").

## Server Actions

Model: `useCases/projects/actions.ts`. An action is a thin `"use server"` function:

1. `runAction(program, (t) => ({ Tag: t("…") }))` (`useCases/server.ts`). It resolves the session first
   (`requireSession`; none: `NotAuthenticated`), runs the program as the learner, and answers an `ActionResult`
   in the learner's language (`toActionResult`).
2. The program decodes its own input with the domain schemas (`useCases/projects/programs.ts`), so a form and an
   action get the same answer. Never trust an action's parameter types: they come from any POST.
3. On success, `revalidatePath(...)` for each route that renders the data (`HOME` for projects), or `redirect()`.
   Use `revalidateTag` once reads are cached with tags; none are today.

```ts
// Wrong: no session check, raw input, error thrown to the client
export async function renameProject(id: string, name: string) {
  await api.projects.rename({ params: { projectId: id as ProjectId }, payload: { name } })
}
// Right
export async function renameProject(projectId: string, name: string): Promise<ActionResult<void>> {
  const result = await runAction(programs.renameProject({ id: projectId, name }), (t) => ({ ProjectNotFound: t("home.errors.projectGone") }))
  if (result.ok) revalidatePath(HOME)
  return result
}
```

- Client data still read by atoms (`useProjects`) is refreshed after a successful action: the hook wraps the action
  and calls `invalidateAtom` (`useCases/runtime.ts`) with the `ReactivityKeys` it changed, as `useAction` in
  `useCases/projects/projects.ts` does. Features keep calling hooks, never actions directly.
- An action is registered only in the pages that import it; a POST naming it elsewhere does nothing. Still, check the
  session in every action: the pages that do import it are public URLs.
- Forms posting straight to an action may use `useActionState`/`useOptimistic`; TanStack Form stays for field-level
  validation, and its `onSubmit` calls the hook.

## Client components with logic

- A component has a view model, `use<Component>.ts` in its folder returning `{ state, operations }`, when it holds
  more than one piece of state, any effect beyond a single subscription, or derivations before its JSX. The
  component renders what the hook returns and wires events to `operations`; no JSX in the hook. A component with
  one state and one subscription (`SavedAt`, `HelpHost`) keeps them: a hook file would add a file and nothing else.
  ```ts
  // PagePicker/PathsStep/usePathsStep.ts
  export function usePathsStep({ onPick, marked }: { onPick: (path: PathSummary) => void; marked: string | null }) {
    const [query, setQuery] = useState('');
    const items = useMemo(() => pathsFor(paths ?? [], last, query), [paths, last, query]);   // pure, tested
    return { state: { query, items }, operations: { setQuery, keyDown } };
  }
  ```
- Derivations that need no React (filtering, grouping, ordering) are pure functions in `<Component>.helpers.ts`,
  unit tested, and the view model calls them: `groupPaths`, `searchRows`, `pathsFor`.
- A form inside a modal, popover or palette lives in its own component inside it, so the container's unmounting on
  close resets it. Never reset a form with an effect on `opened`. **Why:** the project, new map, video link and
  quick capture forms each did, and each got it slightly different (one cleared on close, one on open).
- A hook whose atom runs work that outlives the form (fire and forget, not awaited before closing) lives in the
  container that stays mounted, never in the remounting form; pass its function down. **Why:** an unmounted
  `fn` atom is dropped and its running Effect interrupted: quick captures were lost on slow connections (BUG-001).
- Hooks that run Effect programs live in `useCases/`, not in features. Feature hooks hold view state only.

## State rules

- Never call `setState` in the render body. Derive instead: a value computable from props/state is a `const`, or
  `useMemo` when expensive.
- `useEffect` is for syncing with something outside React (DOM, subscription, timer). Never for deriving state or
  for reacting to an event: handle it in the event handler.
- Effect deps list only what must re-run the effect. Objects and arrays derived during render never go in deps;
  read them through a ref updated in an effect, as `AccountLocale` in `app/AccountLocale.tsx` does with `seen`.
- `useAtomValue(atom, selector)` with the narrowest selector; never read a whole atom to use one field.
- Keys are stable ids from the domain, never array indexes for lists that reorder.

## Environment variables

- Read in a config module only: `infrastructure/http/ApiClient.ts` (browser-safe, `NEXT_PUBLIC_*`) or
  `infrastructure/server/ServerApiClient.ts` (`server-only`). ESLint rejects `process.env` anywhere else
  (`next.config.js`, `playwright.config.ts`, `e2e/**` and `NODE_ENV` aside).
- Secrets never use `NEXT_PUBLIC_*`. Server-only vars are read only from `server-only` modules.

## Pre-flight checklist

- [ ] New screen reads on the server through `queries.ts`; `'use client'` only on interactive leaves.
- [ ] `page`/`layout` have no `fetch`, Effect or rules; `params` awaited and decoded.
- [ ] Data segments have `error.tsx` and call `notFound()` for missing resources; `loading.tsx` only for slow reads, never on public routes.
- [ ] Each Server Action decodes, checks the session, runs, maps the error and revalidates.
- [ ] Client logic is in a colocated `use<Component>` returning `{ state, operations }`.
- [ ] No `setState` in render; no derived objects in effect deps; narrow atom selectors.
- [ ] No `process.env` outside the config module; no secret in `NEXT_PUBLIC_*`.
