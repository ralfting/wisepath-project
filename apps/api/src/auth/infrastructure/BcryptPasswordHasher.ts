import { randomUUID } from "node:crypto"
import { Effect, Layer } from "effect"
import * as bcrypt from "bcrypt"
import { PasswordHasher } from "../application/PasswordHasher"

/** Cost of each hash: 2^10 rounds */
const ROUNDS = 10

/** Passwords hashed with bcrypt */
export const BcryptPasswordHasher = Layer.effect(
  PasswordHasher,
  Effect.gen(function*() {
    // Compared against when there is no account, so that takes as long as a real check
    const standIn = yield* Effect.promise(() => bcrypt.hash(randomUUID(), ROUNDS))
    return PasswordHasher.of({
      hash: (password) => Effect.promise(() => bcrypt.hash(password, ROUNDS)),
      verify: (password, hash) =>
        Effect.promise(() => bcrypt.compare(password, hash ?? standIn)).pipe(Effect.map((same) => same && hash !== null))
    })
  })
)
