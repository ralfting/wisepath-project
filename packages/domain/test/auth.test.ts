import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Schema } from "effect"
import { Credentials, SignupDetails, User, UserId } from "../src/auth/index"

describe("auth schemas", () => {
  it.effect("accepts well-formed credentials and trims the email", () =>
    Effect.gen(function*() {
      const credentials = yield* Schema.decodeUnknownEffect(Credentials)({ email: " ada@example.com ", password: "x" })
      assert.strictEqual(credentials.email, "ada@example.com")
    }))

  it.effect("rejects an email without a domain", () =>
    Effect.gen(function*() {
      const exit = yield* Effect.exit(Schema.decodeUnknownEffect(Credentials)({ email: "ada", password: "x" }))
      assert.isTrue(Exit.isFailure(exit))
    }))

  it.effect("requires a sign-up password of at least 8 characters", () =>
    Effect.gen(function*() {
      const short = yield* Effect.exit(
        Schema.decodeUnknownEffect(SignupDetails)({ name: "Ada", email: "ada@example.com", password: "1234567" })
      )
      const ok = yield* Effect.exit(
        Schema.decodeUnknownEffect(SignupDetails)({ name: "Ada", email: "ada@example.com", password: "12345678" })
      )
      assert.isTrue(Exit.isFailure(short))
      assert.isTrue(Exit.isSuccess(ok))
    }))

  it("shows the email when a user has no name", () => {
    const id = UserId.make("u1")
    assert.strictEqual(new User({ id, email: "ada@example.com", name: null }).displayName, "ada@example.com")
    assert.strictEqual(new User({ id, email: "ada@example.com", name: "Ada" }).displayName, "Ada")
  })
})
