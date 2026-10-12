import { Schema } from "effect"

/** The email and password do not match an account */
export class InvalidCredentials extends Schema.TaggedError<InvalidCredentials>()("InvalidCredentials", {}) {}

/** An account already exists for this email */
export class EmailAlreadyRegistered extends Schema.TaggedError<EmailAlreadyRegistered>()(
  "EmailAlreadyRegistered",
  {}
) {}

/** There is no session, or it expired */
export class NotAuthenticated extends Schema.TaggedError<NotAuthenticated>()("NotAuthenticated", {}) {}

/** The account service could not be reached or answered unexpectedly */
export class AuthUnavailable extends Schema.TaggedError<AuthUnavailable>()("AuthUnavailable", {
  cause: Schema.Defect()
}) {}
