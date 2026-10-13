import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { Credentials, EmailAlreadyRegistered, InvalidCredentials, NotAuthenticated, SignupDetails, UserId } from "@wisepath/domain/auth"
import { InvalidRequest } from "./InvalidRequest"

/**
 * Accounts and sessions (under /api/auth). Logging in or signing up sets the
 * session in an httpOnly cookie (`access_token`), which every other endpoint
 * reads. Domain errors travel as their own JSON (`{ "_tag": "InvalidCredentials" }`)
 * with the status they declare.
 */

/** A user as the API returns it */
export const UserJson = Schema.Struct({
  id: UserId,
  email: Schema.String,
  name: Schema.NullOr(Schema.String)
})

export class AuthApiGroup extends HttpApiGroup.make("auth")
  .add(
    HttpApiEndpoint.post("login", "/login", {
      payload: Credentials,
      success: Schema.Struct({ user: UserJson }),
      error: [InvalidRequest, InvalidCredentials]
    }),
    HttpApiEndpoint.post("signup", "/signup", {
      payload: SignupDetails,
      success: Schema.Struct({ user: UserJson }).pipe(HttpApiSchema.status(201)),
      error: [InvalidRequest, EmailAlreadyRegistered]
    }),
    HttpApiEndpoint.post("logout", "/logout"),
    HttpApiEndpoint.get("me", "/me", {
      success: Schema.Struct({ user: UserJson }),
      error: NotAuthenticated
    })
  )
  .prefix("/auth")
{}
