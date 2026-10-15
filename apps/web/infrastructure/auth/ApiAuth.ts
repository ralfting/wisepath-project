import { Effect, Layer, Option } from "effect"
import { Auth, AuthUnavailable, User } from "@wisepath/domain/auth"
import { ApiClient } from "../http/ApiClient"

/**
 * Auth backed by the WisePath API. Expected outcomes (wrong password, email
 * taken, no session) stay typed; anything else becomes AuthUnavailable.
 */
export const ApiAuth = Layer.effect(
  Auth,
  Effect.gen(function*() {
    const client = yield* ApiClient
    const unavailable = (cause: unknown) => new AuthUnavailable({ cause })

    const login = Effect.fn("Auth.login")(
      function*(credentials: Parameters<Auth["Service"]["login"]>[0]) {
        const { user } = yield* client.auth.login({ payload: credentials })
        return new User(user)
      },
      Effect.catchIf((error) => error._tag !== "InvalidCredentials", (error) => Effect.fail(unavailable(error)))
    )

    const signup = Effect.fn("Auth.signup")(
      function*(details: Parameters<Auth["Service"]["signup"]>[0]) {
        const { user } = yield* client.auth.signup({ payload: details })
        return new User(user)
      },
      Effect.catchIf((error) => error._tag !== "EmailAlreadyRegistered", (error) => Effect.fail(unavailable(error)))
    )

    const logout = Effect.fn("Auth.logout")(
      function*() {
        yield* client.auth.logout()
      },
      Effect.mapError(unavailable)
    )

    const currentUser = Effect.fn("Auth.currentUser")(
      function*() {
        const { user } = yield* client.auth.me()
        return Option.some(new User(user))
      },
      Effect.catchTag("NotAuthenticated", () => Effect.succeed(Option.none<User>())),
      Effect.mapError(unavailable)
    )

    const updateSettings = Effect.fn("Auth.updateSettings")(
      function*(settings: Parameters<Auth["Service"]["updateSettings"]>[0]) {
        const { user } = yield* client.auth.updateMe({ payload: settings })
        return new User(user)
      },
      Effect.mapError(unavailable)
    )

    return Auth.of({ login, signup, logout, currentUser, updateSettings })
  })
).pipe(Layer.provide(ApiClient.layer))
