import { Context } from "effect"
import type { Effect } from "effect"

/** Turns passwords into hashes worth storing, and checks one against a hash */
export class PasswordHasher extends Context.Service<PasswordHasher, {
  readonly hash: (password: string) => Effect.Effect<string>
  /**
   * Whether the password matches the hash. Without a hash (no such account)
   * it still does the same work and answers false, so a wrong email takes as
   * long as a wrong password and doesn't reveal which accounts exist.
   */
  readonly verify: (password: string, hash: string | null) => Effect.Effect<boolean>
}>()("@wisepath/api/auth/application/PasswordHasher") {}
