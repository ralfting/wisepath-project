---
paths:
  - "apps/web/middleware.ts"
  - "apps/web/**/actions.ts"
  - "apps/web/**/queries.ts"
  - "apps/web/app/**/route.ts"
  - "apps/web/app/(auth)/**"
  - "apps/web/useCases/auth/**"
  - "apps/web/infrastructure/**"
  - "apps/web/next.config.js"
---

# Security

The NestJS API is the authority: it checks the session on every endpoint except signup, login and logout, and
answers 404 for another learner's map. The web server adds its own checks because Server Actions and route handlers
are public POST endpoints, callable without the UI.

## Session

- Reads (`queries.ts`): run through `runServer`, which sends the request's cookies; the API checks the session on
  every call and answers another learner's data as not found. A failed read maps to "nothing to show" (`null`,
  `notFound()`), never to data. When a page must send a logged-out learner to the login, it resolves the session
  (`currentUser` through `runServer`) and calls `redirect(loginHref(...))`.
- Writes (`actions.ts`, route handlers): resolve the session (`currentUser` through `runServer`) before anything
  else; none: fail with `NotAuthenticated`. **Why:** an action is a public POST endpoint; checking first keeps a
  half-done write or a redirect from depending on the API refusing later.
- `middleware.ts` checks only that the `access_token` cookie exists. It is a redirect convenience, never access
  control. **Why:** an expired or forged cookie passes it.
- Hiding a button, a route or a menu item protects nothing; the check is on the server, every time.
- The session cookie is httpOnly and set by the API, straight on the browser (login, signup and logout are not
  Server Actions; see [react-next.md](react-next.md)). Never copy it in web code, never expose the token to client
  JS, never store it in `localStorage`.
- Never put request-specific data (cookie, user) in a module-level variable or the shared `ManagedRuntime`
  ([effect.md](effect.md), "The edge").

## Authorization

Decided 2026-10-17, built (plan 14): the API enforces access, the web follows the `access` it sends.

- The unit of access is the path (map). Projects, the Inbox and review states stay private to their owner;
  sharing a project, if it comes, means "every path in it".
- A path has `visibility: 'private' | 'public'` and members `(pathId, userId, role: 'viewer' | 'editor')`, invited by
  the owner or, for a public path, taken by a learner to study (as viewer).
- Progress is per learner: studied marks live per user (`page_progress`), and nobody sees another learner's marks,
  the owner included. Marking a page studied needs only `viewer`.
- A path is never copied to someone who does not own it: no clone, no "Make a copy", no endpoint that republishes
  another learner's path. Taking a path is a membership; the content stays the owner's.
- A learner's access is one value, `'owner' | 'editor' | 'viewer' | 'none'`, computed by one pure rule
  `accessOf(path, viewer)` in `packages/domain/paths`: owner is owner, a membership gives its role, public gives viewer.
- The API reads the facts with the path in one query (owner, visibility, the reader's membership) and decides with
  `accessOf` itself (`DrizzlePathStore`), so the rule has one implementation. Each use case states what it needs
  (`reads`, `edits`, `manages` in `apps/api/src/paths/application/paths.ts`); lists are the owner's paths and those
  the reader is a member of. Only the owner deletes a path, renames it, changes its kind, visibility or members.
- A public path is read without a session through its own read-only endpoint; no write endpoint accepts anonymous.
- The API sends `access` with the path; the web app reads it to show or hide editing and never decides access.
- No authorization library (CASL and the like). **Why:** the rules must become SQL for lists, CASL has no Drizzle
  adapter, and three levels fit one pure function. Revisit with teams or configurable roles.

## Input

- Every action payload, route handler body, `params`, `searchParams`, `localStorage` value and `postMessage` payload is
  decoded with a Schema before use ([effect.md](effect.md), "Decode at every boundary"). TypeScript types from the
  client prove nothing at runtime.
- `?next=` and any redirect target go through `afterLogin`/`loginHref` (`shared/routes.ts`), which keep it
  on our origin. Never `redirect(searchParams.get('next'))`. **Why:** an open redirect sends a learner to a phishing page
  after a real login.
- Ids from the URL are decoded to branded ids; never interpolated into an API path by hand (the contract client builds paths).

## Rendering user content

- Never `dangerouslySetInnerHTML` with learner or third-party content. Markdown stays `html: false`
  (`MarkdownEditor.tsx`); help text uses `features/help/markup.ts`, which builds React nodes, not HTML.
- Link previews (title, description, icon from other sites) are text and image URLs only; render as text.
- Every `href` from content or previews is checked to be `http:` or `https:` before rendering; never allow
  `javascript:` or `data:`.
- External links: `target="_blank"` with `rel="noopener noreferrer"`; `window.open(url, '_blank', 'noopener,noreferrer')`.
- Video embeds use `youtube-nocookie.com` or the YouTube iframe API as `features/paths/editor/video` does; no other iframe
  source without asking.

## Secrets and config

- No secret in the client bundle: nothing secret in `NEXT_PUBLIC_*`, in a client component or in a module a client
  component imports. Server-only values live in `import 'server-only'` modules.
- `API_ORIGIN` is a server-only rewrite target (`next.config.js`), read by `infrastructure/server/ServerApiClient.ts`
  (`server-only`). Never read it in a module the browser bundle can load.
- Never commit `.env.local`. `apps/api/.env` is tracked by the user's choice; do not change that, do not copy its values
  into web code or docs.
- Never log cookies, tokens, passwords or full request bodies. Errors sent to the client carry `_tag` and a
  translated message only.

## Browser storage

- `localStorage` holds UI preferences only (sidebar collapsed, video corner, last path, recent searches). Never
  learner content, tokens or anything that must stay private on a shared computer.
- Read values are decoded and fall back to a default when invalid (as `parseRecent` does in `useCases/search/recent.ts`).

## Pre-flight checklist

- [ ] Reads go through `runServer`; actions and route handlers resolve the session first.
- [ ] Nothing relies on `middleware.ts` or hidden UI for access.
- [ ] Every external input decoded with a Schema; redirects go through `afterLogin`/`loginHref`.
- [ ] No `dangerouslySetInnerHTML` with content; hrefs restricted to http(s); external links `noopener noreferrer`.
- [ ] No secret in `NEXT_PUBLIC_*` or client-reachable modules.
- [ ] Session cookie stays httpOnly; no request data in module scope or the shared runtime.
- [ ] Access comes from `accessOf` and the API's `access`; no permission abstraction or library added.
