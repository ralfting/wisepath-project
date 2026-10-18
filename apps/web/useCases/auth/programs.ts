import { Effect, Option, Schema } from "effect"
import { AccountDeletion, AccountSettings, Auth, Credentials, NotAuthenticated, SignupDetails } from "@wisepath/domain/auth"

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

/**
 * Runs the program only for a signed-in learner, NotAuthenticated otherwise.
 * Server Actions start with it: they are public endpoints, so the session is
 * checked before anything is decoded or written.
 */
export const requireSession = <A, E, R>(program: Effect.Effect<A, E, R>) =>
  Effect.gen(function*() {
    if (Option.isNone(yield* currentUser)) return yield* new NotAuthenticated()
    return yield* program
  })

export const updateSettings = Effect.fn("useCases.auth.updateSettings")(function*(input: { locale: string | null }) {
  const settings = yield* Schema.decodeUnknownEffect(AccountSettings)(input)
  return yield* Auth.use((auth) => auth.updateSettings(settings))
})

export const deleteAccount = Effect.fn("useCases.auth.deleteAccount")(function*(input: { password: string }) {
  const deletion = yield* Schema.decodeUnknownEffect(AccountDeletion)(input)
  yield* Auth.use((auth) => auth.deleteAccount(deletion))
})
