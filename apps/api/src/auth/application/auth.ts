import { randomUUID } from 'node:crypto';
import { Effect, Option } from 'effect';
import { EmailAlreadyRegistered, InvalidCredentials, User, UserId } from '@wisepath/domain/auth';
import type { Credentials, SignupDetails } from '@wisepath/domain/auth';
import { PasswordHasher } from './PasswordHasher';
import { UserStore } from './UserStore';

/**
 * Account use cases. They answer with the user; starting the session (the
 * token in a cookie) is the controller's part.
 */

export const signup = Effect.fn('auth.signup')(function* (details: SignupDetails) {
  const users = yield* UserStore;
  const hasher = yield* PasswordHasher;

  const user = new User({ id: UserId.make(randomUUID()), email: details.email, name: details.name });
  const passwordHash = yield* hasher.hash(details.password);

  const added = yield* users.insert(user, passwordHash);
  if (!added) return yield* new EmailAlreadyRegistered();

  return user;
});

export const login = Effect.fn('auth.login')(function* (credentials: Credentials) {
  const users = yield* UserStore;
  const hasher = yield* PasswordHasher;

  const account = yield* users.findByEmail(credentials.email);
  const hash = Option.match(account, { onNone: () => null, onSome: (a) => a.passwordHash });

  // Checked even without an account, so both wrong answers take as long
  const matches = yield* hasher.verify(credentials.password, hash);
  if (Option.isNone(account) || !matches) return yield* new InvalidCredentials();

  return account.value.user;
});

/** The user a session belongs to, if the account still exists */
export const sessionUser = Effect.fn('auth.sessionUser')(function* (id: UserId) {
  const users = yield* UserStore;
  return yield* users.findById(id);
});
