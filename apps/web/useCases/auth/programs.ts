import { Effect, Schema } from "effect"
import { Auth, Credentials, SignupDetails } from "@wisepath/domain/auth"

/**
 * Account use cases as Effect programs: decode what the person typed with the
 * domain schemas, then call the Auth service. Hooks in session.ts run these;
 * tests run them against an in-memory Auth.
 */

export const login = Effect.fn("useCases.auth.login")(function*(input: { email: string; password: string }) {
  const credentials = yield* Schema.decodeUnknownEffect(Credentials)(input)
  return yield* Auth.use((auth) => auth.login(credentials))
})

export const signup = Effect.fn("useCases.auth.signup")(function*(input: { name: string; email: string; password: string }) {
  const details = yield* Schema.decodeUnknownEffect(SignupDetails)(input)
  return yield* Auth.use((auth) => auth.signup(details))
})

export const logout = Effect.fn("useCases.auth.logout")(function*() {
  yield* Auth.use((auth) => auth.logout())
})

export const currentUser = Auth.use((auth) => auth.currentUser())
