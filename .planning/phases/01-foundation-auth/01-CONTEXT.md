# Phase 1: Foundation & Auth - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can securely access their accounts and the application infrastructure is ready. This phase establishes the foundation: monorepo setup, authentication system (email/password only), session management, database connection, and deployment infrastructure. Everything else builds on this foundation.

</domain>

<decisions>
## Implementation Decisions

### Monorepo Architecture
- **Tool**: Turborepo for monorepo orchestration
- **Package manager**: pnpm
- **Structure**: 
  - `apps/web` - Next.js frontend
  - `apps/api` - NestJS backend
  - `packages/types` - Shared TypeScript types and utilities
- **Communication**: REST API (NestJS serves endpoints, Next.js calls them)
- **Tech stack**:
  - Frontend: Next.js 14+ with App Router
  - Backend: NestJS
  - Shared types in packages/types

### Authentication Strategy
- **Approach**: JWT token-based authentication
- **Backend implementation**: NestJS Passport (@nestjs/passport)
  - passport-local for email/password
- **Frontend state management**: React Context + custom hooks (AuthContext)
- **Password requirements**: Minimum 8 characters (standard, user-friendly)
- **Supported methods**:
  - Email/password signup and login only

### Database & Infrastructure
- **Database**: PostgreSQL
- **Database hosting**: Neon (serverless Postgres)
- **ORM**: Prisma
- **Schema location**: Backend (apps/api)
- **Type sharing**: Prisma types exported via packages/types

### Hosting & Deployment
- **Frontend**: Vercel (optimized for Next.js)
- **Backend**: Render (Node.js hosting)
- **Database**: Neon (separate service)
- **Monorepo deployment**: Turborepo handles build orchestration

### Session Management
- **Token storage**: httpOnly cookies (most secure, XSS-protected)
- **Access token lifetime**: 24 hours
- **Refresh token**: 7-day refresh token for seamless renewal
- **Persistence**: Sessions persist across browser close/refresh (requirement AUTH-05)
- **Cookie settings**: 
  - httpOnly: true
  - secure: true (production)
  - sameSite: 'strict' or 'lax' (depending on CORS needs)

### UI Styling
- **CSS framework**: Tailwind CSS
- **Component library**: shadcn/ui (Radix UI primitives + Tailwind)
- **Design system**: Modern minimalist (clean, white space, subtle colors)
- **Theme support**: Both light and dark modes (light mode default)
- **Implementation**: Tailwind dark: variant with theme toggle

### Claude's Discretion
- Exact folder structure within apps/web and apps/api
- Loading states and error handling patterns
- API endpoint naming conventions
- Component organization within apps/web
- Environment variable management approach
- Git commit strategy during implementation

</decisions>

<code_context>
## Existing Code Insights

### Current State
- Greenfield project - no existing codebase
- Clean slate for architecture decisions
- No legacy patterns to work around

### Reusable Assets
- None yet - this phase creates the foundation

### Established Patterns
- None yet - this phase establishes the patterns

### Integration Points
This phase creates the core integration points that all future phases depend on:
- Turborepo workspace configuration
- NestJS REST API structure
- Next.js app router setup
- Prisma schema and database connection
- Auth context and protected route patterns
- Shared types package structure

</code_context>

<specifics>
## Specific Ideas

- **Target audience**: Technical learners comfortable with markdown (from PROJECT.md)
- **Deployment goal**: Application must be accessible via web browser (requirement from Phase 1 success criteria)
- **Session behavior**: User stays logged in across browser refresh (AUTH-05) - this explicitly requires persistent sessions
- **Logout access**: User can log out from any page (AUTH-06) - global auth context needed

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

All capabilities discussed (auth, infrastructure, deployment) are explicitly part of Phase 1's success criteria.

</deferred>

---

*Phase: 01-foundation-auth*
*Context gathered: 2026-03-06*
