import { Duration, Effect, Exit, Queue, Schedule, SubscriptionRef } from "effect"
import type { Scope } from "effect"
import { PathRepository, addPage, canEdit, canManage, editPage, editPath, mayEditPage, removePage } from "@wisepath/domain/paths"
import type {
  NewPage,
  PageEdit,
  PageId,
  Path,
  PathEdit,
  PathId,
  PageNotFound,
  PathNotFound,
  PathsUnavailable,
  RootPageProtected,
  TitleTaken
} from "@wisepath/domain/paths"
import type { ProjectNotFound } from "@wisepath/domain/projects"

/**
 * Sync
 * Keeps an open map in step with the API. A change shows at once: the
 * command is applied to the map on screen with the same domain function the
 * API runs, then sent in the background, one command at a time, in order.
 *
 * - Typing in one page merges into a single command, sent once the typing
 *   pauses (SEND_AFTER).
 * - No connection or a server error: the command waits and is sent again,
 *   more slowly each time; nothing typed is lost while the tab stays open.
 * - A change the reader's access does not allow (a reader editing text) is
 *   not applied; the API would refuse it anyway.
 * - The API refuses a command (a title another tab just took, a page someone
 *   deleted): that command is dropped, the map is read again, and the
 *   changes still waiting are applied on top of it.
 */

export type Command =
  | { readonly _tag: "UpdatePath"; readonly edit: PathEdit }
  | { readonly _tag: "CreatePage"; readonly page: NewPage }
  | { readonly _tag: "UpdatePage"; readonly pageId: PageId; readonly edit: PageEdit }
  | { readonly _tag: "RemovePage"; readonly pageId: PageId }

/** Why a change was undone; the words are in the messages (home.save.notice) */
export type Notice = "titleTaken" | "pageDeleted" | "rootProtected" | "notSaved"

export interface SyncState {
  /** The map as the learner sees it: what the API has, plus what is still on its way */
  readonly path: Path
  readonly status: "saved" | "saving" | "offline"
  /** Why the last change was undone, until the next change */
  readonly notice: Notice | null
}

export interface PathSession {
  readonly state: SubscriptionRef.SubscriptionRef<SyncState>
  /** Applies a change right away and queues it; false when it can't apply (and nothing changes) */
  readonly dispatch: (command: Command) => boolean
}

/** How long typing must pause before its edit is sent */
export const SEND_AFTER = Duration.millis(400)

/** Retries while the API can't be reached: quickly at first, then every 10 seconds */
const reconnect = Schedule.min([Schedule.exponential("500 millis"), Schedule.spaced("10 seconds")])

/** A command applied to a map, as the API will apply it */
export const applyCommand = (path: Path, command: Command) => {
  switch (command._tag) {
    case "UpdatePath":
      return Effect.succeed(editPath(path, command.edit))
    case "CreatePage":
      return addPage(path, command.page).pipe(Effect.map((r) => r.path))
    case "UpdatePage":
      return editPage(path, command.pageId, command.edit)
    case "RemovePage":
      return removePage(path, command.pageId)
  }
}

/** Whether the map's reader may make this change: a reader only marks pages studied */
const mayApply = (path: Path, command: Command) => {
  switch (command._tag) {
    case "UpdatePath":
      return canManage(path.access)
    case "CreatePage":
    case "RemovePage":
      return canEdit(path.access)
    case "UpdatePage":
      return mayEditPage(path, command.pageId, command.edit)
  }
}

/** The map with the command applied, or unchanged when it doesn't apply */
const applied = (path: Path, command: Command): Path | undefined => {
  const exit = Effect.runSyncExit(applyCommand(path, command))
  return Exit.isSuccess(exit) ? exit.value : undefined
}

/** Every way the API can refuse a change to an open map (ProjectNotFound only when one moves it, which these don't) */
type SendError = PathNotFound | PageNotFound | TitleTaken | RootPageProtected | ProjectNotFound | PathsUnavailable

const send = (repo: PathRepository["Service"], pathId: PathId, command: Command): Effect.Effect<unknown, SendError> => {
  switch (command._tag) {
    case "UpdatePath":
      return repo.update(pathId, command.edit)
    case "CreatePage":
      return repo.createPage(pathId, command.page)
    case "UpdatePage":
      return repo.updatePage(pathId, command.pageId, command.edit)
    case "RemovePage":
      return repo.removePage(pathId, command.pageId)
  }
}

/** Why the API refused a change: what the learner is told (home.save.notice.* in the messages) */
const noticeFor = (error: { readonly _tag: string }): Notice => {
  switch (error._tag) {
    case "TitleTaken":
      return "titleTaken"
    case "PageNotFound":
      return "pageDeleted"
    case "RootPageProtected":
      return "rootProtected"
    default:
      return "notSaved"
  }
}

interface Entry {
  command: Command
  /** When it was queued or last merged into, for the typing pause */
  at: number
  /** Being sent: nothing merges into it any more */
  sending: boolean
}

/** Typing edits one page at a time: consecutive edits of a page become one */
const merge = (last: Entry, command: Command): boolean => {
  if (last.sending || last.command._tag !== "UpdatePage" || command._tag !== "UpdatePage") return false
  if (last.command.pageId !== command.pageId) return false
  const previousTitle = last.command.edit.previousTitle ?? command.edit.previousTitle
  last.command = {
    ...last.command,
    edit: { ...last.command.edit, ...command.edit, ...(previousTitle !== undefined ? { previousTitle } : {}) }
  }
  return true
}

/** Edits of the text wait for a pause in typing; everything else goes at once */
const waitsForPause = (command: Command) =>
  command._tag === "UpdatePage" && (command.edit.content !== undefined || command.edit.title !== undefined)

/**
 * Opens a map for editing: reads it, then keeps sending its changes for as
 * long as the session's scope is open.
 */
export const openPathSession = Effect.fn("useCases.paths.openSession")(function*(
  pathId: PathId
): Effect.fn.Return<PathSession, PathNotFound | PathsUnavailable, PathRepository | Scope.Scope> {
  const repo = yield* PathRepository
  const initial = yield* repo.get(pathId)

  // What the API has confirmed, and the changes on their way, oldest first
  let confirmed = initial
  const queue: Array<Entry> = []
  const state = yield* SubscriptionRef.make<SyncState>({ path: initial, status: "saved", notice: null })
  const wake = yield* Queue.sliding<void>(1)

  const current = () => Effect.runSync(SubscriptionRef.get(state))
  const publish = (next: Partial<SyncState>) => Effect.runSync(SubscriptionRef.update(state, (s) => ({ ...s, ...next })))

  const dispatch = (command: Command): boolean => {
    if (!mayApply(current().path, command)) return false
    const next = applied(current().path, command)
    if (!next) return false
    const now = Date.now()
    const last = queue.at(-1)
    if (last && merge(last, command)) last.at = now
    else queue.push({ command, at: now, sending: false })
    publish({ path: next, status: "saving", notice: null })
    Queue.offerUnsafe(wake, undefined)
    return true
  }

  /** The map on screen: what the API has, with what is still waiting on top */
  const rebase = (base: Path) => queue.reduce((path, entry) => applied(path, entry.command) ?? path, base)

  const sendHead = Effect.gen(function*() {
    const entry = queue[0]
    if (waitsForPause(entry.command)) {
      const waited = Date.now() - entry.at
      if (waited < Duration.toMillis(SEND_AFTER)) {
        yield* Effect.sleep(Duration.millis(Duration.toMillis(SEND_AFTER) - waited))
        return
      }
    }
    entry.sending = true
    const result = yield* send(repo, pathId, entry.command).pipe(
      Effect.tapError((error) => (error._tag === "PathsUnavailable" ? Effect.sync(() => publish({ status: "offline" })) : Effect.void)),
      Effect.retry({ while: (error) => error._tag === "PathsUnavailable", schedule: reconnect }),
      Effect.tap(() => Effect.sync(() => current().status === "offline" && publish({ status: "saving" }))),
      Effect.exit
    )
    queue.shift()
    if (Exit.isSuccess(result)) {
      confirmed = applied(confirmed, entry.command) ?? confirmed
    } else {
      // Refused: read the map again and put what is still waiting back on top
      const error = Exit.findErrorOption(result)
      confirmed = yield* repo.get(pathId).pipe(
        Effect.retry({ while: (e) => e._tag === "PathsUnavailable", schedule: reconnect }),
        Effect.orElseSucceed(() => confirmed)
      )
      publish({ path: rebase(confirmed), notice: error._tag === "Some" ? noticeFor(error.value) : noticeFor({ _tag: "" }) })
    }
    if (queue.length === 0) publish({ status: "saved" })
  })

  yield* Effect.forkScoped(
    Effect.forever(
      Effect.gen(function*() {
        if (queue.length === 0) yield* Queue.take(wake)
        else yield* sendHead
      })
    )
  )

  return { state, dispatch }
})
