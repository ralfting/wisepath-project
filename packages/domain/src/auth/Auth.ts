import type { Effect, Option } from "effect"
import { Context } from "effect"
import type { AuthUnavailable, EmailAlreadyRegistered, InvalidCredentials } from "./errors"
import type { Credentials, SignupDetails, User } from "./User"

/**
 * Accounts and sessions. The domain only states what it needs; an
 * infrastructure layer provides the implementation (today, the WisePath API).
 */
export class Auth extends Context.Service<Auth, {
  /** Starts a session for these credentials */
  readonly login: (credentials: Credentials) => Effect.Effect<User, InvalidCredentials | AuthUnavailable>
  /** Creates an account and starts a session */
  readonly signup: (details: SignupDetails) => Effect.Effect<User, EmailAlreadyRegistered | AuthUnavailable>
  /** Ends the current session */
  readonly logout: () => Effect.Effect<void, AuthUnavailable>
  /** The user of the current session, if any */
  readonly currentUser: () => Effect.Effect<Option.Option<User>, AuthUnavailable>
}>()("@wisepath/domain/auth/Auth") {}
