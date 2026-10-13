import { Schema, SchemaTransformation } from "effect"
import { HttpApiSchema } from "effect/http-api"

/** A domain error carried as NestJS's `{ message, statusCode }` body with this status */
export const nestError = <E>(error: Schema.Codec<E, unknown>, status: number, make: () => E) =>
  Schema.Struct({ message: Schema.Unknown }).pipe(
    Schema.decodeTo(
      Schema.toType(error),
      SchemaTransformation.transform({ decode: make, encode: (): { readonly message: unknown } => ({ message: String(status) }) })
    ),
    HttpApiSchema.status(status)
  )
