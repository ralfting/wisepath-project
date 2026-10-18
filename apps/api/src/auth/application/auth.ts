import { randomUUID } from 'node:crypto';
import { Effect, Option } from 'effect';
import { EmailAlreadyRegistered, InvalidCredentials, User, UserId } from '@wisepath/domain/auth';
import type { AccountSettings, Credentials, SignupDetails } from '@wisepath/domain/auth';
import { MemberStore } from '../../paths/application/MemberStore';
import { PasswordHasher } from './PasswordHasher';
import { UserStore } from './UserStore';

/**
 * Account use cases. They answer with the user; starting the session (the
 * token in a cookie) is the controller's part.
 */

export const signup = Effect.fn('auth.signup')(function* (details: SignupDetails) {
  const users = yield* UserStore;
  const hasher = yield* PasswordHasher;

  const user = new User({ id: UserId.make(randomUUID()), email: details.email, name: details.name, locale: null });
  const passwordHash = yield* hasher.hash(details.password);

  const added = yield* users.insert(user, passwordHash);
  if (!added) return yield* new EmailAlreadyRegistered();

  // Paths shared with this email before it had an account become the new account's
  yield* (yield* MemberStore).claimInvites(user.id, user.email);
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

  // An invite typed in another case than the account's email was kept as one; it is claimed here
  yield* (yield* MemberStore).claimInvites(account.value.user.id, account.value.user.email);
  return account.value.user;
});

/** Saves the account's settings and answers with the user as they now are */
export const updateSettings = Effect.fn('auth.updateSettings')(function* (id: UserId, settings: AccountSettings) {
  const users = yield* UserStore;
  yield* users.setLocale(id, settings.locale);
  return yield* users.findById(id);
});

/** The user a session belongs to, if the account still exists */
export const sessionUser = Effect.fn('auth.sessionUser')(function* (id: UserId) {
  const users = yield* UserStore;
  return yield* users.findById(id);
});
