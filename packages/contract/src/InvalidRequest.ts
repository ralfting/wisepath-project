import { Schema } from "effect"

/** The request did not match the contract: a missing field, a wrong type */
export class InvalidRequest extends Schema.TaggedError<InvalidRequest>()("InvalidRequest", {
  message: Schema.String
}, { httpApiStatus: 400 }) {}
