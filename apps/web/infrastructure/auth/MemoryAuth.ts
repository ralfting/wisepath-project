import { Effect, Layer, Option, Ref } from "effect"
import { Auth, EmailAlreadyRegistered, InvalidCredentials, User, UserId } from "@wisepath/domain/auth"

interface Account {
  readonly user: User
  readonly password: string
}

/**
 * Auth kept in memory: for tests and for running the app without the API.
 * Starts with the given accounts and no session, or signed in as the account with `signedIn` as its email.
 */
export const MemoryAuth = (
  accounts: ReadonlyArray<{ email: string; password: string; name?: string }> = [],
  options: { readonly signedIn?: string } = {}
) =>
  Layer.effect(
    Auth,
    Effect.gen(function*() {
      const store = yield* Ref.make<ReadonlyArray<Account>>(
        accounts.map((a, i) => ({
          user: new User({ id: UserId.make(`user-${i + 1}`), email: a.email, name: a.name ?? null }),
          password: a.password
        }))
      )
      const session = yield* Ref.make(
        Option.fromNullishOr((yield* Ref.get(store)).find((a) => a.user.email === options.signedIn)?.user)
      )

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
        currentUser: () => Ref.get(session),
        updateSettings: Effect.fn("MemoryAuth.updateSettings")(function*(settings) {
          const current = yield* Ref.get(session)
          if (Option.isNone(current)) return yield* Effect.die("No session")
          const user = new User({ ...current.value, locale: settings.locale })
          yield* Ref.update(store, (all) => all.map((a) => (a.user.id === user.id ? { ...a, user } : a)))
          yield* Ref.set(session, Option.some(user))
          return user
        }),
        deleteAccount: Effect.fn("MemoryAuth.deleteAccount")(function*(deletion) {
          const current = yield* Ref.get(session)
          if (Option.isNone(current)) return yield* Effect.die("No session")
          const account = (yield* Ref.get(store)).find((a) => a.user.id === current.value.id)
          if (!account || account.password !== deletion.password) return yield* new InvalidCredentials()
          yield* Ref.update(store, (all) => all.filter((a) => a.user.id !== account.user.id))
          yield* Ref.set(session, Option.none())
        })
      })
    })
  )
