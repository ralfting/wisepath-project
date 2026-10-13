import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { Credentials, EmailAlreadyRegistered, InvalidCredentials, NotAuthenticated, SignupDetails, UserId } from "@wisepath/domain/auth"
import { nestError } from "./nestError"

/**
 * The account endpoints as the NestJS API serves them today (under /api/auth).
 * Error bodies are NestJS's `{ message, statusCode }`, so each error is read
 * from its status code and its body is decoded into the domain error.
 */

/** A user as the API returns it from login and signup */
export const UserJson = Schema.Struct({
  id: UserId,
  email: Schema.String,
  name: Schema.NullOr(Schema.String)
})

/** /auth/me returns the session's token claims, which carry no name */
export const SessionUserJson = Schema.Struct({
  id: UserId,
  email: Schema.String
})

export class AuthApiGroup extends HttpApiGroup.make("auth")
  .add(
    HttpApiEndpoint.post("login", "/login", {
      payload: Credentials,
      // NestJS answers POST with 201 Created
      success: Schema.Struct({ user: UserJson }).pipe(HttpApiSchema.status(201)),
      error: nestError(InvalidCredentials, 401, () => new InvalidCredentials())
    }),
    HttpApiEndpoint.post("signup", "/signup", {
      payload: SignupDetails,
      success: Schema.Struct({ user: UserJson }).pipe(HttpApiSchema.status(201)),
      error: nestError(EmailAlreadyRegistered, 400, () => new EmailAlreadyRegistered())
    }),
    HttpApiEndpoint.post("logout", "/logout", {
      success: Schema.Struct({ message: Schema.String }).pipe(HttpApiSchema.status(201))
    }),
    HttpApiEndpoint.get("me", "/me", {
      success: Schema.Struct({ user: SessionUserJson }),
      error: nestError(NotAuthenticated, 401, () => new NotAuthenticated())
    })
  )
  .prefix("/auth")
{}
