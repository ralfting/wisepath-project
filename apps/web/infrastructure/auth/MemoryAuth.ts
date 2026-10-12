import { Effect, Layer, Option, Ref } from "effect"
import { Auth, EmailAlreadyRegistered, InvalidCredentials, User, UserId } from "@wisepath/domain/auth"

interface Account {
  readonly user: User
  readonly password: string
}

/**
 * Auth kept in memory: for tests and for running the app without the API.
 * Starts with the given accounts and no session.
 */
export const MemoryAuth = (accounts: ReadonlyArray<{ email: string; password: string; name?: string }> = []) =>
  Layer.effect(
    Auth,
    Effect.gen(function*() {
      const store = yield* Ref.make<ReadonlyArray<Account>>(
        accounts.map((a, i) => ({
          user: new User({ id: UserId.make(`user-${i + 1}`), email: a.email, name: a.name ?? null }),
          password: a.password
        }))
      )
      const session = yield* Ref.make(Option.none<User>())

      return Auth.of({
        login: Effect.fn("MemoryAuth.login")(function*(credentials) {
          const account = (yield* Ref.get(store)).find((a) => a.user.email === credentials.email)
          if (!account || account.password !== credentials.password) return yield* new InvalidCredentials()
          yield* Ref.set(session, Option.some(account.user))
          return account.user
        }),
        signup: Effect.fn("MemoryAuth.signup")(function*(details) {
          const existing = yield* Ref.get(store)
          if (existing.some((a) => a.user.email === details.email)) return yield* new EmailAlreadyRegistered()
          const user = new User({ id: UserId.make(`user-${existing.length + 1}`), email: details.email, name: details.name })
          yield* Ref.set(store, [...existing, { user, password: details.password }])
          yield* Ref.set(session, Option.some(user))
          return user
        }),
        logout: () => Ref.set(session, Option.none()),
        currentUser: () => Ref.get(session)
      })
    })
  )
