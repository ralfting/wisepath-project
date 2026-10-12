import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Option } from "effect"
import { MemoryAuth } from "@/infrastructure/auth/MemoryAuth"
import { messageFor } from "../messages"
import * as programs from "./programs"

const accounts = [{ email: "ada@example.com", password: "correct-horse", name: "Ada" }]

describe("auth use cases", () => {
  it.effect("logs in with valid credentials and starts a session", () =>
    Effect.gen(function*() {
      const user = yield* programs.login({ email: " ada@example.com ", password: "correct-horse" })
      const current = yield* programs.currentUser
      assert.strictEqual(user.displayName, "Ada")
      assert.isTrue(Option.isSome(current))
    }).pipe(Effect.provide(MemoryAuth(accounts))))

  it.effect("rejects a wrong password with a message for the person", () =>
    Effect.gen(function*() {
      const exit = yield* Effect.exit(programs.login({ email: "ada@example.com", password: "nope" }))
      assert.strictEqual(messageFor(exit, { InvalidCredentials: "Email or password is incorrect." }), "Email or password is incorrect.")
    }).pipe(Effect.provide(MemoryAuth(accounts))))

  it.effect("rejects a malformed email before calling the service", () =>
    Effect.gen(function*() {
      const exit = yield* Effect.exit(programs.login({ email: "ada", password: "x" }))
      assert.strictEqual(messageFor(exit, {}), "Enter a valid email address")
    }).pipe(Effect.provide(MemoryAuth(accounts))))

  it.effect("signs up, refuses a taken email, and logs out", () =>
    Effect.gen(function*() {
      yield* programs.signup({ name: "Lin", email: "lin@example.com", password: "12345678" })
      const taken = yield* Effect.exit(programs.signup({ name: "Ada 2", email: "ada@example.com", password: "12345678" }))
      assert.isTrue(Exit.isFailure(taken))
      yield* programs.logout()
      assert.isTrue(Option.isNone(yield* programs.currentUser))
    }).pipe(Effect.provide(MemoryAuth(accounts))))
})
