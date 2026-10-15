import { Effect, Schedule } from "effect"
import { InboxItemId, InboxRepository } from "@wisepath/domain/inbox"
import type { Capture } from "@wisepath/domain/inbox"

/**
 * Inbox use cases as Effect programs. Capturing and discarding wait out a lost
 * connection, retrying more slowly each time, so nothing captured is lost
 * while the tab stays open; both are safe to send twice.
 */

/** Retries while the API can't be reached: quickly at first, then every 10 seconds */
const reconnect = Schedule.min([Schedule.exponential("500 millis"), Schedule.spaced("10 seconds")])
const untilReached = { while: (error: { readonly _tag: string }) => error._tag === "InboxUnavailable", schedule: reconnect }

/** A fresh id; made here so the item shows in the Inbox before the API answers */
export const newItemId = (): InboxItemId =>
  InboxItemId.make(
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  )

/** Everything waiting in the Inbox, newest first */
export const listInbox = InboxRepository.use((repo) => repo.list).pipe(Effect.withSpan("useCases.inbox.list"))

export const capture = Effect.fn("useCases.inbox.capture")(function*(command: Capture) {
  const repo = yield* InboxRepository
  return yield* repo.capture(command).pipe(Effect.retry(untilReached))
})

export const discard = Effect.fn("useCases.inbox.discard")(function*(id: InboxItemId) {
  const repo = yield* InboxRepository
  yield* repo.discard(id).pipe(Effect.retry(untilReached))
})
