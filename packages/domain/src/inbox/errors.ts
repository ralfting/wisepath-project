import { Schema } from "effect"

/** The Inbox could not be reached right now (network, server down); trying again may work */
export class InboxUnavailable extends Schema.TaggedError<InboxUnavailable>()("InboxUnavailable", {
  cause: Schema.Defect()
}) {}
