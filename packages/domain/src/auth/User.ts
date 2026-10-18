import { Schema } from "effect"

/**
 * Users and the data that identifies them.
 */

export const UserId = Schema.String.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

export const Email = Schema.Trim.check(
  Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: "Enter a valid email address" })
).pipe(Schema.brand("Email"))
export type Email = typeof Email.Type

/** The languages WisePath speaks */
export const Locale = Schema.Literals(["en", "pt-BR"])
export type Locale = typeof Locale.Type

/** A person with an account. Accounts made through Google or GitHub may have no name. */
export class User extends Schema.Class<User>("User")({
  id: UserId,
  email: Schema.String,
  name: Schema.NullOr(Schema.String),
  /** The language they chose; none (null or absent) follows their browser */
  locale: Schema.optional(Schema.NullOr(Locale))
}) {
  get displayName(): string {
    return this.name?.trim() || this.email
  }
}

/** What a learner can change about their account */
export const AccountSettings = Schema.Struct({
  locale: Schema.NullOr(Locale)
})
export type AccountSettings = typeof AccountSettings.Type

/** What someone types to log in */
export const Credentials = Schema.Struct({
  email: Email,
  password: Schema.String.check(Schema.isMinLength(1, { message: "Enter your password" }))
})
export type Credentials = typeof Credentials.Type

/** What a learner types to confirm deleting their account */
export const AccountDeletion = Schema.Struct({
  password: Schema.String.check(Schema.isMinLength(1, { message: "Enter your password" }))
})
export type AccountDeletion = typeof AccountDeletion.Type

/** What someone types to create an account */
export const SignupDetails = Schema.Struct({
  name: Schema.Trim.check(Schema.isMinLength(1, { message: "Tell us your name" })),
  email: Email,
  password: Schema.String.check(Schema.isMinLength(8, { message: "Use at least 8 characters" }))
})
export type SignupDetails = typeof SignupDetails.Type
