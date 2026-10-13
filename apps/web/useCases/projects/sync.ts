import { Duration, Effect, Exit, Queue, Schedule, SubscriptionRef } from "effect"
import type { Scope } from "effect"
import { ProjectRepository, addPage, editPage, editProject, removePage } from "@wisepath/domain/projects"
import type {
  NewPage,
  PageEdit,
  PageId,
  Project,
  ProjectEdit,
  ProjectId,
  ProjectNotFound,
  ProjectsUnavailable
} from "@wisepath/domain/projects"

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
 * - The API refuses a command (a title another tab just took, a page someone
 *   deleted): that command is dropped, the map is read again, and the
 *   changes still waiting are applied on top of it.
 */

export type Command =
  | { readonly _tag: "UpdateProject"; readonly edit: ProjectEdit }
  | { readonly _tag: "CreatePage"; readonly page: NewPage }
  | { readonly _tag: "UpdatePage"; readonly pageId: PageId; readonly edit: PageEdit }
  | { readonly _tag: "RemovePage"; readonly pageId: PageId }

export interface SyncState {
  /** The map as the learner sees it: what the API has, plus what is still on its way */
  readonly project: Project
  readonly status: "saved" | "saving" | "offline"
  /** Why the last change was undone, until the next change */
  readonly notice: string | null
}

export interface ProjectSession {
  readonly state: SubscriptionRef.SubscriptionRef<SyncState>
  /** Applies a change right away and queues it; false when it can't apply (and nothing changes) */
  readonly dispatch: (command: Command) => boolean
}

/** How long typing must pause before its edit is sent */
export const SEND_AFTER = Duration.millis(400)

/** Retries while the API can't be reached: quickly at first, then every 10 seconds */
const reconnect = Schedule.min([Schedule.exponential("500 millis"), Schedule.spaced("10 seconds")])

/** A command applied to a map, as the API will apply it */
export const applyCommand = (project: Project, command: Command) => {
  switch (command._tag) {
    case "UpdateProject":
      return Effect.succeed(editProject(project, command.edit))
    case "CreatePage":
      return addPage(project, command.page).pipe(Effect.map((r) => r.project))
    case "UpdatePage":
      return editPage(project, command.pageId, command.edit)
    case "RemovePage":
      return removePage(project, command.pageId)
  }
}

/** The map with the command applied, or unchanged when it doesn't apply */
const applied = (project: Project, command: Command): Project | undefined => {
  const exit = Effect.runSyncExit(applyCommand(project, command))
  return Exit.isSuccess(exit) ? exit.value : undefined
}

const send = (repo: ProjectRepository["Service"], projectId: ProjectId, command: Command) => {
  switch (command._tag) {
    case "UpdateProject":
      return repo.update(projectId, command.edit)
    case "CreatePage":
      return repo.createPage(projectId, command.page)
    case "UpdatePage":
      return repo.updatePage(projectId, command.pageId, command.edit)
    case "RemovePage":
      return repo.removePage(projectId, command.pageId)
  }
}

/** What the learner is told when the API refuses a change */
const noticeFor = (error: { readonly _tag: string }): string => {
  switch (error._tag) {
    case "TitleTaken":
      return "Another page already has that title, so the change was undone."
    case "PageNotFound":
      return "That page was deleted elsewhere, so the change was undone."
    case "RootPageProtected":
      return "The map's main page can't be changed that way."
    default:
      return "A change couldn't be saved and was undone."
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
export const openProjectSession = Effect.fn("useCases.projects.openSession")(function*(
  projectId: ProjectId
): Effect.fn.Return<ProjectSession, ProjectNotFound | ProjectsUnavailable, ProjectRepository | Scope.Scope> {
  const repo = yield* ProjectRepository
  const initial = yield* repo.get(projectId)

  // What the API has confirmed, and the changes on their way, oldest first
  let confirmed = initial
  const queue: Array<Entry> = []
  const state = yield* SubscriptionRef.make<SyncState>({ project: initial, status: "saved", notice: null })
  const wake = yield* Queue.sliding<void>(1)

  const current = () => Effect.runSync(SubscriptionRef.get(state))
  const publish = (next: Partial<SyncState>) => Effect.runSync(SubscriptionRef.update(state, (s) => ({ ...s, ...next })))

  const dispatch = (command: Command): boolean => {
    const next = applied(current().project, command)
    if (!next) return false
    const now = Date.now()
    const last = queue.at(-1)
    if (last && merge(last, command)) last.at = now
    else queue.push({ command, at: now, sending: false })
    publish({ project: next, status: "saving", notice: null })
    Queue.offerUnsafe(wake, undefined)
    return true
  }

  /** The map on screen: what the API has, with what is still waiting on top */
  const rebase = (base: Project) => queue.reduce((project, entry) => applied(project, entry.command) ?? project, base)

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
    const result = yield* send(repo, projectId, entry.command).pipe(
      Effect.tapError((error) => (error._tag === "ProjectsUnavailable" ? Effect.sync(() => publish({ status: "offline" })) : Effect.void)),
      Effect.retry({ while: (error) => error._tag === "ProjectsUnavailable", schedule: reconnect }),
      Effect.tap(() => Effect.sync(() => current().status === "offline" && publish({ status: "saving" }))),
      Effect.exit
    )
    queue.shift()
    if (Exit.isSuccess(result)) {
      confirmed = applied(confirmed, entry.command) ?? confirmed
    } else {
      // Refused: read the map again and put what is still waiting back on top
      const error = Exit.findErrorOption(result)
      confirmed = yield* repo.get(projectId).pipe(
        Effect.retry({ while: (e) => e._tag === "ProjectsUnavailable", schedule: reconnect }),
        Effect.orElseSucceed(() => confirmed)
      )
      publish({ project: rebase(confirmed), notice: error._tag === "Some" ? noticeFor(error.value) : noticeFor({ _tag: "" }) })
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
