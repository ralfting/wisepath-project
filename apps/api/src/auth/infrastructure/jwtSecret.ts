/** Signs local sessions when no JWT_SECRET is set; never accepted in production */
const DEVELOPMENT_SECRET = 'local-dev-only-change-me';

/**
 * The key that signs session tokens. Anyone who knows it can sign in as
 * anyone, so in production the API refuses to start without one of its own.
 */
export function jwtSecret(env: { readonly JWT_SECRET?: string; readonly NODE_ENV?: string }): string {
  const secret = env.JWT_SECRET?.trim();
  if (env.NODE_ENV !== 'production') return secret || DEVELOPMENT_SECRET;

  if (!secret || secret === DEVELOPMENT_SECRET) {
    throw new Error('JWT_SECRET must be set to a long random string of your own in production');
  }
  if (secret.length < 32) throw new Error('JWT_SECRET is too short for production: use at least 32 characters');

  return secret;
}
