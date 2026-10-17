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
and when a change is already rewriting a screen ([architecture.md](architecture.md), "Target structure").

## Who does what

| Operation | Mechanism |
|---|---|
| First render data: paths list, projects, inbox, a map, a page, the session | Server Component calling `useCases/<domain>/queries.ts` |
| Tab title, `notFound()`, `redirect()` | Server: `generateMetadata` and the page, through the same queries |
| Discrete mutation: login, signup, logout, project CRUD, create/delete path, file/discard inbox item | Server Action in `useCases/<domain>/actions.ts` |
| Continuous map editing (commands, offline queue, 400 ms debounce) | Client atoms in `useCases/paths/sync.ts`, straight to the API |
| Pure interaction: palettes, drawer, editor, mind map, keyboard | Client component, as deep in the tree as possible |

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
- Props crossing to a client component are serializable: no functions (except Server Actions), no class instances.
  Domain `Schema.Class` values (`User`) cross as their encoded form.
- `queries.ts` and `infrastructure/server/*` start with `import 'server-only'`. Actions start with `'use server'` and
  export only async functions.

## Routes (`app/`)

- `page.tsx`/`layout.tsx` stay thin: await and decode `params`, call queries, render a feature. No `fetch`, no Effect,
  no business rules.
- `params` and `searchParams` are Promises in Next 15: `const { pathId } = await params`.
- Every segment that loads data has `loading.tsx` (skeleton matching the final layout) and `error.tsx`
  (`'use client'`, translated message, retry with `reset`). Missing resources call `notFound()` and render the
  segment's `not-found.tsx`. **Why:** today `PathGate` decides not-found in the browser, so the server answers 200 for
  a missing map.
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

Order inside every action, no step skipped:

1. Decode the payload (`FormData` or object) with the domain schema.
2. Resolve the session on the server; fail with `NotAuthenticated` if absent.
3. Run the program with `runAction`.
4. Map the result with `toActionResult` (tagged error to `{ ok: false, _tag, message }`).
5. `revalidateTag(ReactivityKeys.x)` for every key the mutation changes, or `redirect()`.

- Call actions from forms with `useActionState` for pending and error state; `useOptimistic` when the result must
  show before the round trip. TanStack Form stays for field-level validation; its `onSubmit` calls the action.
- Login and signup: the API's `Set-Cookie` is copied into `cookies().set(...)` in the action, httpOnly, same flags.
  `TODO(decide): session cookie forwarding helper` owner and flags.

## Client components with logic

- Component plus colocated hook `use<Component>.ts` returning `{ state, operations }`; no JSX in the hook. With no
  callables, return `operations: {}`.
  ```ts
  export function usePagePicker(pages: ReadonlyArray<PageSummary>) {
    const [query, setQuery] = useState('');
    const matches = useMemo(() => matchPages(pages, query), [pages, query]);
    return { state: { query, matches }, operations: { setQuery } };
  }
  ```
- Hooks that run Effect programs live in `useCases/`, not in features. Feature hooks hold view state only.

## State rules

- Never call `setState` in the render body. Derive instead: a value computable from props/state is a `const`, or
  `useMemo` when expensive.
- `useEffect` is for syncing with something outside React (DOM, subscription, timer). Never for deriving state or
  for reacting to an event: handle it in the event handler.
- Effect deps list only what must re-run the effect. Objects and arrays derived during render never go in deps;
  read them through a ref updated in an effect, as `AccountLocale` in `app/providers.tsx` does with `seen`.
- `useAtomValue(atom, selector)` with the narrowest selector; never read a whole atom to use one field.
- Keys are stable ids from the domain, never array indexes for lists that reorder.

## Environment variables

- Read once in `infrastructure/config.ts` (target; today `infrastructure/http/ApiClient.ts`), decoded with Schema.
  Never read `process.env` elsewhere (exception: `next.config.js`).
- Secrets never use `NEXT_PUBLIC_*`. Server-only vars are read only from `server-only` modules.

## Pre-flight checklist

- [ ] New screen reads on the server through `queries.ts`; `'use client'` only on interactive leaves.
- [ ] `page`/`layout` have no `fetch`, Effect or rules; `params` awaited and decoded.
- [ ] Data segments have `loading.tsx`, `error.tsx` and call `notFound()` for missing resources.
- [ ] Each Server Action decodes, checks the session, runs, maps the error and revalidates.
- [ ] Client logic is in a colocated `use<Component>` returning `{ state, operations }`.
- [ ] No `setState` in render; no derived objects in effect deps; narrow atom selectors.
- [ ] No `process.env` outside the config module; no secret in `NEXT_PUBLIC_*`.
