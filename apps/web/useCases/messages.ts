import { Exit, Option, SchemaIssue } from "effect"
import type { Schema } from "effect"

/**
 * Turns a failed use case into the one sentence a person should read.
 * Errors with a known tag get a fixed message; Schema errors use the first
 * validation message; anything else gets a generic retry message.
 */
export function messageFor<E extends { readonly _tag: string }>(
  exit: Exit.Exit<unknown, E>,
  messages: Partial<Record<E["_tag"], string>>,
  fallback = "Something went wrong. Try again in a moment."
): string | null {
  if (Exit.isSuccess(exit)) return null
  const error = Exit.findErrorOption(exit)
  if (Option.isNone(error)) return fallback
  const tagged = error.value
  if (tagged._tag === "SchemaError") {
    const issues = SchemaIssue.makeFormatterStandardSchemaV1()((tagged as unknown as Schema.SchemaError).issue).issues
    return issues[0]?.message ?? fallback
  }
  return messages[tagged._tag as E["_tag"]] ?? fallback
}
