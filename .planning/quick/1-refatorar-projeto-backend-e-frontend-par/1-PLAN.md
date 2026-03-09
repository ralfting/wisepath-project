---
phase: quick-01
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # Frontend - New Clean Architecture structure
  - apps/web/domain/auth/entities/user.entity.ts
  - apps/web/domain/auth/types/auth.types.ts
  - apps/web/domain/auth/services/auth.service.ts
  - apps/web/domain/auth/hooks/useAuth.ts
  - apps/web/domain/auth/hooks/useAuthSession.ts
  - apps/web/domain/auth/components/LoginForm.tsx
  - apps/web/domain/auth/components/SignupForm.tsx
  - apps/web/domain/auth/index.ts
  # Frontend - Update existing pages to use domain modules
  - apps/web/app/(auth)/login/page.tsx
  - apps/web/app/(auth)/signup/page.tsx
  - apps/web/app/layout.tsx
  - apps/web/components/auth/logout-button.tsx
  # Frontend - Keep utilities (api.ts is infra, not domain-specific)
  - apps/web/lib/api.ts
  # Backend - Clean Architecture layers
  - apps/api/src/auth/domain/user.entity.ts
  - apps/api/src/auth/application/auth.service.ts
  - apps/api/src/auth/application/dto/signup.dto.ts
  - apps/api/src/auth/application/dto/login.dto.ts
  - apps/api/src/auth/infrastructure/auth.controller.ts
  - apps/api/src/auth/infrastructure/jwt.strategy.ts
  - apps/api/src/auth/infrastructure/jwt.guard.ts
  - apps/api/src/auth/auth.module.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "Frontend auth code follows domain/feature/ structure with entities, types, services, hooks, components"
    - "Backend auth code follows domain/application/infrastructure layers"
    - "Auth functionality remains unchanged (no breaking changes)"
    - "All existing imports and references updated to new paths"
  artifacts:
    - path: "apps/web/domain/auth/index.ts"
      provides: "Public API for auth domain module"
      exports: ["useAuth", "useAuthSession", "LoginForm", "SignupForm", "User"]
    - path: "apps/web/domain/auth/entities/user.entity.ts"
      provides: "Core User entity (framework-agnostic)"
      min_lines: 10
    - path: "apps/web/domain/auth/services/auth.service.ts"
      provides: "API communication layer for auth"
      min_lines: 30
    - path: "apps/api/src/auth/domain/user.entity.ts"
      provides: "Backend User domain entity"
      min_lines: 10
    - path: "apps/api/src/auth/application/auth.service.ts"
      provides: "Backend auth business logic (use cases)"
      min_lines: 80
    - path: "apps/api/src/auth/infrastructure/auth.controller.ts"
      provides: "HTTP layer for auth endpoints"
      min_lines: 50
  key_links:
    - from: "apps/web/app/(auth)/login/page.tsx"
      to: "apps/web/domain/auth/index.ts"
      via: "import LoginForm and useAuth hook"
      pattern: "import.*from.*@/domain/auth"
    - from: "apps/web/domain/auth/services/auth.service.ts"
      to: "apps/web/lib/api.ts"
      via: "uses api utility for HTTP calls"
      pattern: "import.*from.*@/lib/api"
    - from: "apps/api/src/auth/infrastructure/auth.controller.ts"
      to: "apps/api/src/auth/application/auth.service.ts"
      via: "dependency injection"
      pattern: "constructor.*AuthService"
---

<objective>
Refactor frontend and backend authentication code to align with Clean Architecture patterns documented in 01-CONTEXT.md.

**Purpose:** Establish the architectural foundation for scalable, maintainable domain-driven development across all future features.

**Output:** 
- Frontend: `domain/auth/` module with entities, types, services, hooks, components, and public API
- Backend: Layered `auth/` module with domain, application, and infrastructure separation
- Zero breaking changes - all existing functionality preserved
</objective>

<execution_context>
@/home/ralfting/.config/Claude/get-shit-done/workflows/execute-plan.md
@/home/ralfting/.config/Claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/01-foundation-auth/01-CONTEXT.md

## Clean Architecture Pattern Reference

From CONTEXT.md, the frontend structure should be:

```
domain/{feature}/
  entities/        — Core business models (pure, framework-agnostic)
  types/           — Data contracts and DTOs
  enums/           — Closed set of valid values
  services/        — API communication and data transformation
  hooks/           — Domain logic hooks (React Query, composition)
  components/      — UI components for this domain
  index.ts         — Public API of the module
```

Backend should follow:
```
{feature}/
  domain/          — Core entities and business rules
  application/     — Use cases, services, DTOs
  infrastructure/  — Controllers, guards, strategies
  {feature}.module.ts
```

## Current Code Context

**Frontend files to refactor:**
- `apps/web/lib/auth-context.tsx` → Move to `domain/auth/hooks/useAuth.ts` + `services/auth.service.ts`
- `apps/web/app/(auth)/login/page.tsx` → Extract LoginForm component to `domain/auth/components/`
- `apps/web/app/(auth)/signup/page.tsx` → Extract SignupForm component to `domain/auth/components/`
- `apps/web/components/auth/logout-button.tsx` → Move to `domain/auth/components/`

**Backend files to refactor:**
- `apps/api/src/auth/auth.service.ts` → `auth/application/auth.service.ts`
- `apps/api/src/auth/auth.controller.ts` → `auth/infrastructure/auth.controller.ts`
- `apps/api/src/auth/jwt.strategy.ts` → `auth/infrastructure/jwt.strategy.ts`
- `apps/api/src/auth/jwt.guard.ts` → `auth/infrastructure/jwt.guard.ts`
- `apps/api/src/auth/dto/*.dto.ts` → `auth/application/dto/*.dto.ts`

**Existing User interface in auth-context.tsx:**
```typescript
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
```
</context>

<interfaces>
<!-- Current auth implementation interfaces from existing code -->

From apps/web/lib/auth-context.tsx:
```typescript
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}
```

From apps/web/lib/api.ts:
```typescript
export async function api<T>(endpoint: string, options: FetchOptions = {}): Promise<T>
export function get<T>(endpoint: string, options?: FetchOptions)
export function post<T>(endpoint: string, data?: unknown, options?: FetchOptions)
```

From apps/api/src/auth/dto/signup.dto.ts and login.dto.ts:
```typescript
export class SignupDto {
  email: string;
  password: string;
  name?: string;
}

export class LoginDto {
  email: string;
  password: string;
}
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Refactor Frontend to Clean Architecture (domain/auth/)</name>
  <files>
    apps/web/domain/auth/entities/user.entity.ts
    apps/web/domain/auth/types/auth.types.ts
    apps/web/domain/auth/services/auth.service.ts
    apps/web/domain/auth/hooks/useAuth.ts
    apps/web/domain/auth/hooks/useAuthSession.ts
    apps/web/domain/auth/components/LoginForm.tsx
    apps/web/domain/auth/components/SignupForm.tsx
    apps/web/domain/auth/components/LogoutButton.tsx
    apps/web/domain/auth/index.ts
    apps/web/app/(auth)/login/page.tsx
    apps/web/app/(auth)/signup/page.tsx
    apps/web/app/layout.tsx
  </files>
  <action>
Create new Clean Architecture structure for frontend auth:

**1. Create entities layer** (`domain/auth/entities/user.entity.ts`):
- Define pure User entity class (framework-agnostic)
- Properties: id, email, name (all from current User interface)
- No external dependencies (pure TypeScript)

**2. Create types layer** (`domain/auth/types/auth.types.ts`):
- Define DTOs: LoginCredentials, SignupCredentials, AuthResponse
- Define API contracts matching backend responses
- Keep existing User interface as type export

**3. Create services layer** (`domain/auth/services/auth.service.ts`):
- Extract all API calls from auth-context.tsx
- Methods: login(), signup(), logout(), getMe()
- Use `@/lib/api` utility for HTTP calls (api.post, api.get)
- Return typed responses using types from auth.types.ts
- Handle response transformation (API → domain entities)

**4. Create hooks layer** (`domain/auth/hooks/`):
- `useAuth.ts`: Context-based hook exposing user, loading, login, signup, logout
- `useAuthSession.ts`: Hook for session restoration on mount (extracted from AuthContext useEffect)
- Maintain React Context pattern internally
- Delegate to auth.service.ts for actual API calls

**5. Create components layer** (`domain/auth/components/`):
- `LoginForm.tsx`: Extract form UI from login page (keep all form logic, validation, error handling)
- `SignupForm.tsx`: Extract form UI from signup page
- `LogoutButton.tsx`: Move from components/auth/logout-button.tsx
- Each component uses useAuth hook internally

**6. Create public API** (`domain/auth/index.ts`):
- Export: useAuth, useAuthSession, LoginForm, SignupForm, LogoutButton, User (type)
- Re-export only what other modules need
- Hide internal implementation details (services, entities remain internal)

**7. Update pages** to use domain module:
- `app/(auth)/login/page.tsx`: Import and render LoginForm from domain/auth
- `app/(auth)/signup/page.tsx`: Import and render SignupForm from domain/auth
- Remove all inline logic (now in components)

**8. Update app layout**:
- Replace auth-context import with domain/auth
- Update AuthProvider import path

**CRITICAL:** Preserve exact functionality - same API calls, same state management, same behavior. Only structure changes.
  </action>
  <verify>
    <automated>
# Verify new structure exists
test -f apps/web/domain/auth/entities/user.entity.ts && \
test -f apps/web/domain/auth/types/auth.types.ts && \
test -f apps/web/domain/auth/services/auth.service.ts && \
test -f apps/web/domain/auth/hooks/useAuth.ts && \
test -f apps/web/domain/auth/components/LoginForm.tsx && \
test -f apps/web/domain/auth/index.ts && \
echo "✓ Frontend Clean Architecture structure created"

# Verify pages updated
grep -q "from '@/domain/auth'" apps/web/app/\(auth\)/login/page.tsx && \
echo "✓ Login page uses domain module"

# Verify build passes
cd apps/web && pnpm build
    </automated>
  </verify>
  <done>
- Frontend auth code organized in domain/auth/ with entities, types, services, hooks, components
- All pages import from @/domain/auth (not lib/auth-context)
- Old lib/auth-context.tsx and components/auth/logout-button.tsx deleted
- Frontend builds successfully with no TypeScript errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Refactor Backend to Clean Architecture Layers</name>
  <files>
    apps/api/src/auth/domain/user.entity.ts
    apps/api/src/auth/application/auth.service.ts
    apps/api/src/auth/application/dto/signup.dto.ts
    apps/api/src/auth/application/dto/login.dto.ts
    apps/api/src/auth/infrastructure/auth.controller.ts
    apps/api/src/auth/infrastructure/jwt.strategy.ts
    apps/api/src/auth/infrastructure/jwt.guard.ts
    apps/api/src/auth/auth.module.ts
  </files>
  <action>
Reorganize backend auth into Clean Architecture layers:

**1. Create domain layer** (`auth/domain/user.entity.ts`):
- Define pure User domain entity
- Core business rules and validation logic
- No framework dependencies (no NestJS decorators here)

**2. Move to application layer** (`auth/application/`):
- Move `auth.service.ts` → `auth/application/auth.service.ts`
- Keep all business logic: signup(), login(), validateUser(), generateJwtToken(), sanitizeUser()
- Update imports to reference domain/user.entity.ts
- Move DTOs: `dto/*.dto.ts` → `auth/application/dto/*.dto.ts`
- No changes to service logic, only file location

**3. Move to infrastructure layer** (`auth/infrastructure/`):
- Move `auth.controller.ts` → `auth/infrastructure/auth.controller.ts`
- Move `jwt.strategy.ts` → `auth/infrastructure/jwt.strategy.ts`
- Move `jwt.guard.ts` → `auth/infrastructure/jwt.guard.ts`
- Update imports to reference `../application/auth.service`
- Update DTO imports to `../application/dto/*`

**4. Update auth.module.ts**:
- Update all import paths to reflect new structure
- Controllers import from `./infrastructure/auth.controller`
- Providers import AuthService from `./application/auth.service`
- Guards/strategies from `./infrastructure/*`
- DTOs from `./application/dto/*`

**5. Delete old files** in auth/ root:
- Remove auth/auth.service.ts (moved to application/)
- Remove auth/auth.controller.ts (moved to infrastructure/)
- Remove auth/jwt.strategy.ts (moved to infrastructure/)
- Remove auth/jwt.guard.ts (moved to infrastructure/)
- Remove auth/dto/ folder (moved to application/dto/)

**CRITICAL:** Zero behavioral changes - same endpoints, same validation, same responses. Only folder structure changes.
  </action>
  <verify>
    <automated>
# Verify new structure exists
test -f apps/api/src/auth/domain/user.entity.ts && \
test -f apps/api/src/auth/application/auth.service.ts && \
test -f apps/api/src/auth/application/dto/signup.dto.ts && \
test -f apps/api/src/auth/infrastructure/auth.controller.ts && \
test -f apps/api/src/auth/infrastructure/jwt.strategy.ts && \
echo "✓ Backend Clean Architecture layers created"

# Verify old files removed
! test -f apps/api/src/auth/auth.service.ts && \
! test -f apps/api/src/auth/auth.controller.ts && \
echo "✓ Old auth files removed"

# Verify backend builds
cd apps/api && pnpm build
    </automated>
  </verify>
  <done>
- Backend auth code organized in domain/, application/, infrastructure/ layers
- auth.module.ts imports from new layer paths
- Old flat structure files deleted
- Backend builds successfully with no TypeScript errors
  </done>
</task>

<task type="auto">
  <name>Task 3: Update Path Aliases and Verify Integration</name>
  <files>
    apps/web/tsconfig.json
    apps/api/tsconfig.json
  </files>
  <action>
Ensure TypeScript path resolution supports new structure and verify end-to-end functionality:

**1. Verify frontend tsconfig.json** has path alias for domain:
- Check `paths` includes `@/domain/*` mapping to `./domain/*`
- Add if missing (likely already exists with `@/*` wildcard)

**2. Verify backend tsconfig.json** supports relative imports:
- No path aliases needed (using relative imports)
- Confirm `baseUrl` and `outDir` settings intact

**3. Run full integration verification**:
- Build both apps: `pnpm build` (in monorepo root)
- Start backend in dev mode: `cd apps/api && pnpm dev`
- Start frontend in dev mode: `cd apps/web && pnpm dev`
- Verify no import errors in console
- Test auth flow manually: visit login page, verify form renders

**4. Update any remaining references**:
- Search codebase for imports from old paths (lib/auth-context, components/auth/logout-button)
- Update to new domain/auth imports
- Verify no broken imports remain

**AVOID:** Do not run automated E2E tests (not in scope). Manual smoke test is sufficient.
  </action>
  <verify>
    <automated>
# Verify path aliases exist
grep -q '"@/domain/\*"' apps/web/tsconfig.json && echo "✓ Frontend domain alias configured"

# Verify no old imports remain in frontend
! grep -r "from '@/lib/auth-context'" apps/web/app apps/web/components 2>/dev/null && \
echo "✓ No legacy auth-context imports"

# Full build verification
pnpm build && echo "✓ Monorepo builds successfully"
    </automated>
  </verify>
  <done>
- TypeScript configuration supports new domain structure
- All imports updated to new paths (no legacy references)
- Full monorepo builds successfully
- Dev servers start without errors
- Login and signup pages render correctly (manual verification)
  </done>
</task>

</tasks>

<verification>

## Automated Checks

1. **Frontend structure validation:**
   - `domain/auth/` folder exists with all subfolders (entities, types, services, hooks, components)
   - `domain/auth/index.ts` exports public API
   - Old `lib/auth-context.tsx` deleted
   - Pages import from `@/domain/auth`

2. **Backend structure validation:**
   - `auth/domain/`, `auth/application/`, `auth/infrastructure/` folders exist
   - Old flat structure files removed
   - `auth.module.ts` references new paths

3. **Build verification:**
   - `pnpm build` succeeds for entire monorepo
   - No TypeScript errors
   - No import resolution errors

## Manual Checks

1. **Frontend functionality preserved:**
   - Login page renders form correctly
   - Signup page renders form correctly
   - Auth state management works (user context accessible)

2. **Backend functionality preserved:**
   - Auth endpoints still respond (POST /api/auth/login, /api/auth/signup)
   - JWT generation unchanged
   - Cookie handling unchanged

</verification>

<success_criteria>

- [ ] Frontend follows `domain/{feature}/` pattern with entities, types, services, hooks, components, index.ts
- [ ] Backend follows domain/application/infrastructure layering
- [ ] All existing auth functionality works identically (zero breaking changes)
- [ ] No imports from old paths (lib/auth-context, flat auth/ structure)
- [ ] Monorepo builds successfully (`pnpm build` passes)
- [ ] Clean Architecture pattern documented in CONTEXT.md is fully implemented
- [ ] Pattern established as template for all future domain modules

</success_criteria>

<output>
After completion, create `.planning/quick/1-refatorar-projeto-backend-e-frontend-par/1-SUMMARY.md`
</output>
