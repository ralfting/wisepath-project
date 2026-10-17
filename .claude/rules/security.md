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

- Every Server Action, route handler and `queries.ts` function resolves the session on the server before any read or
  write (`currentUser` program on the server runtime, which asks the API). No session: fail with `NotAuthenticated`
  (action) or `redirect(loginHref(...))` (page).
- `middleware.ts` checks only that the `access_token` cookie exists. It is a redirect convenience, never access
  control. **Why:** an expired or forged cookie passes it.
- Hiding a button, a route or a menu item protects nothing; the check is on the server, every time.
- The session cookie is httpOnly and set by the API. When an action forwards it (login, signup), it keeps httpOnly,
  `secure` in production, `sameSite` and path exactly as the API sent them. Never expose the token to client JS,
  never store it in `localStorage`.
- Never put request-specific data (cookie, user) in a module-level variable or the shared `ManagedRuntime`
  ([effect.md](effect.md), "The edge").

## Authorization

- `TODO(decide): permission model`. Today a learner can only reach their own paths, and the API enforces it.
  Do not build roles, permissions, `can(...)` helpers or ownership checks in the web app.

## Input

- Every action payload, route handler body, `params`, `searchParams`, `localStorage` value and `postMessage` payload is
  decoded with a Schema before use ([effect.md](effect.md), "Decode at every boundary"). TypeScript types from the
  client prove nothing at runtime.
- `?next=` and any redirect target go through `afterLogin`/`loginHref` (`features/shared/routes.ts`), which keep it
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
- Video embeds use `youtube-nocookie.com` or the YouTube iframe API as `features/editor/video` does; no other iframe
  source without asking.

## Secrets and config

- No secret in the client bundle: nothing secret in `NEXT_PUBLIC_*`, in a client component or in a module a client
  component imports. Server-only values live in `import 'server-only'` modules.
- `API_ORIGIN` is a server-only rewrite target (`next.config.js`). Never read it in client code.
- Never commit `.env.local`. `apps/api/.env` is tracked by the user's choice; do not change that, do not copy its values
  into web code or docs.
- Never log cookies, tokens, passwords or full request bodies. Errors sent to the client carry `_tag` and a
  translated message only.

## Browser storage

- `localStorage` holds UI preferences only (sidebar collapsed, video corner, last path, recent searches). Never
  learner content, tokens or anything that must stay private on a shared computer.
- Read values are decoded and fall back to a default when invalid (as `parseRecent` does in `useCases/search/recent.ts`).

## Pre-flight checklist

- [ ] Action, route handler or query resolves the session on the server first.
- [ ] Nothing relies on `middleware.ts` or hidden UI for access.
- [ ] Every external input decoded with a Schema; redirects go through `afterLogin`/`loginHref`.
- [ ] No `dangerouslySetInnerHTML` with content; hrefs restricted to http(s); external links `noopener noreferrer`.
- [ ] No secret in `NEXT_PUBLIC_*` or client-reachable modules.
- [ ] Session cookie stays httpOnly; no request data in module scope or the shared runtime.
- [ ] No permission abstraction added.
