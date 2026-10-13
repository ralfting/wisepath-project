import { Schema } from "effect"

/**
 * What can go wrong with accounts and sessions. Errors the API answers with
 * say which HTTP status, so the contract and the server agree on it.
 */

/** The email and password do not match an account */
export class InvalidCredentials extends Schema.TaggedError<InvalidCredentials>()("InvalidCredentials", {}, {
  httpApiStatus: 401
}) {}

/** An account already exists for this email */
export class EmailAlreadyRegistered extends Schema.TaggedError<EmailAlreadyRegistered>()(
  "EmailAlreadyRegistered",
  {},
  { httpApiStatus: 409 }
) {}

/** There is no session, or it expired */
export class NotAuthenticated extends Schema.TaggedError<NotAuthenticated>()("NotAuthenticated", {}, {
  httpApiStatus: 401
}) {}

/** The account service could not be reached or answered unexpectedly */
export class AuthUnavailable extends Schema.TaggedError<AuthUnavailable>()("AuthUnavailable", {
  cause: Schema.Defect()
}) {}
