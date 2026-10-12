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

    // The session endpoint carries no name, so the user's name is unknown here
    const currentUser = Effect.fn("Auth.currentUser")(
      function*() {
        const { user } = yield* client.auth.me()
        return Option.some(new User({ ...user, name: null }))
      },
      Effect.catchTag("NotAuthenticated", () => Effect.succeed(Option.none<User>())),
      Effect.mapError(unavailable)
    )

    return Auth.of({ login, signup, logout, currentUser })
  })
).pipe(Layer.provide(ApiClient.layer))
