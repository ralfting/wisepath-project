/**
 * Auth Domain Module - Public API
 * Export only what external modules need to consume
 */

// Hooks
export { useAuth, AuthProvider } from './hooks/useAuth';
export { useAuthSession } from './hooks/useAuthSession';

// Components
export { LoginForm } from './components/LoginForm';
export { SignupForm } from './components/SignupForm';
export { LogoutButton } from './components/LogoutButton';

// Types (for external consumers)
export type { User } from './types/auth.types';
export type { LoginCredentials, SignupCredentials, AuthResponse } from './types/auth.types';

// Note: Services and entities are internal - not exported
// External modules should use hooks, not services directly
