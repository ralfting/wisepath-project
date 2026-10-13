import { Context } from "effect"
import type { Effect, Option } from "effect"
import type { Email, User, UserId } from "@wisepath/domain/auth"

/** An account as stored: the user and the hash of their password (none for Google or GitHub accounts) */
export interface Account {
  readonly user: User
  readonly passwordHash: string | null
}

/** Where accounts are kept */
export class UserStore extends Context.Service<UserStore, {
  readonly findByEmail: (email: Email) => Effect.Effect<Option.Option<Account>>
  readonly findById: (id: UserId) => Effect.Effect<Option.Option<User>>
  /** Adds the account; false when its email is already registered */
  readonly insert: (user: User, passwordHash: string) => Effect.Effect<boolean>
}>()("@wisepath/api/auth/application/UserStore") {}
