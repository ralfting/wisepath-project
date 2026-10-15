"use client"

import { useCallback, useContext, useSyncExternalStore } from "react"
import { AsyncResult, Atom } from "effect/reactivity"
import { RegistryContext, useAtomSet, useAtomValue } from "@effect/atom-react"
import { Effect, Exit } from "effect"
import { captured, fileItem, makePage } from "@wisepath/domain/inbox"
import type { InboxItem, InboxItemId } from "@wisepath/domain/inbox"
import { PageId } from "@wisepath/domain/projects"
import type { Project } from "@wisepath/domain/projects"
import { useT } from "@/i18n/I18nProvider"
import { newPageId, useOpenProject } from "../projects"
import type { Command } from "../projects"
import { ReactivityKeys, appRuntime } from "../runtime"
import * as programs from "./programs"

/**
 * Inbox use cases: the learner's captured items, capturing one, and filing it.
 * The Inbox on screen is what the API has, with what was just captured on top
 * and what was just filed or deleted taken out, so every action shows at once.
 *
 * Filing changes two things: the page, edited through its map's sync session
 * like any edit, and the Inbox. The item is discarded only once the page's
 * change reached the API, so a refused change leaves it in the Inbox.
 */

const inboxAtom = appRuntime.atom(programs.listInbox).pipe(Atom.withReactivity([ReactivityKeys.inbox, ReactivityKeys.session]))

interface Local {
  /** Captured here, maybe not yet in what the API last listed */
  readonly added: ReadonlyArray<InboxItem>
  /** Filed or deleted here, maybe still listed by the API */
  readonly hidden: ReadonlySet<InboxItemId>
}
const localAtom = Atom.keepAlive(Atom.make<Local>({ added: [], hidden: new Set<InboxItemId>() }))

// Several captures or discards can be on their way at once, so a new one never interrupts another
const captureAtom = appRuntime.fn(programs.capture, { reactivityKeys: [ReactivityKeys.inbox], concurrent: true })
const discardAtom = appRuntime.fn(programs.discard, { reactivityKeys: [ReactivityKeys.inbox], concurrent: true })

export type InboxState =
  | { readonly status: "loading" }
  | { readonly status: "unavailable" }
  | { readonly status: "ready"; readonly items: ReadonlyArray<InboxItem> }

const newestFirst = (a: InboxItem, b: InboxItem) => b.createdAt.localeCompare(a.createdAt)

const inboxViewAtom = Atom.make((get): InboxState => {
  const result = get(inboxAtom)
  const local = get(localAtom)
  if (!AsyncResult.isSuccess(result)) return AsyncResult.isFailure(result) ? { status: "unavailable" } : { status: "loading" }
  const listed = new Set(result.value.map((item) => item.id))
  const items = [...local.added.filter((item) => !listed.has(item.id)), ...result.value]
    .filter((item) => !local.hidden.has(item.id))
    .sort(newestFirst)
  return { status: "ready", items }
})

/** The Inbox loads in the browser (the session cookie belongs to the API), so the server render says "loading" */
const noSubscription = () => () => {}
const useHydrated = () => useSyncExternalStore(noSubscription, () => true, () => false)

/** What is waiting in the Inbox, newest first */
export function useInbox(): InboxState {
  const hydrated = useHydrated()
  const state = useAtomValue(inboxViewAtom)
  return hydrated ? state : { status: "loading" }
}

/** How many items are waiting, for the sidebar; null until known */
export function useInboxCount(): number | null {
  const state = useInbox()
  return state.status === "ready" ? state.items.length : null
}

/** What a capture carries; the id and the time are added here */
export interface CaptureInput {
  readonly text: string
  readonly url?: string
  readonly title?: string
  readonly videoTime?: number
}

const withId = (input: CaptureInput, id = programs.newItemId()) => ({
  id,
  text: input.text,
  ...(input.url ? { url: input.url } : {}),
  ...(input.title?.trim() ? { title: input.title.trim() } : {}),
  ...(input.videoTime !== undefined ? { videoTime: input.videoTime } : {})
})

/** Puts something in the Inbox: it shows at once and is sent in the background */
export function useCapture(): (input: CaptureInput) => InboxItem {
  const registry = useContext(RegistryContext)
  const run = useAtomSet(captureAtom)
  return useCallback(
    (input) => {
      const item = captured(withId(input))
      const local = registry.get(localAtom)
      registry.set(localAtom, { ...local, added: [...local.added, item] })
      run(item)
      return item
    },
    [registry, run]
  )
}

/**
 * Puts something in the Inbox and resolves once the API has it, for a window
 * that closes right after (the web capture popup): true when saved. It waits
 * out a lost connection like any capture.
 */
export function useCaptureAndWait(): (input: CaptureInput) => Promise<boolean> {
  const registry = useContext(RegistryContext)
  const run = useAtomSet(captureAtom, { mode: "promiseExit" })
  return useCallback(
    async (input) => {
      const item = captured(withId(input))
      const local = registry.get(localAtom)
      registry.set(localAtom, { ...local, added: [...local.added, item] })
      return Exit.isSuccess(await run(item))
    },
    [registry, run]
  )
}

/** Hides an item from the Inbox on screen, or shows it again, without telling the API */
function useHide(): (id: InboxItemId, hidden: boolean) => void {
  const registry = useContext(RegistryContext)
  return useCallback(
    (id, hidden) => {
      const local = registry.get(localAtom)
      const next = new Set(local.hidden)
      if (hidden) next.add(id)
      else next.delete(id)
      registry.set(localAtom, { ...local, hidden: next })
    },
    [registry]
  )
}

/** Takes an item out of the Inbox; giving it back brings it back as it was (an undo) */
export function useDiscard(): { discard: (item: InboxItem) => void; restore: (item: InboxItem) => void } {
  const registry = useContext(RegistryContext)
  const runDiscard = useAtomSet(discardAtom)
  const runCapture = useAtomSet(captureAtom)
  const hide = useHide()
  return {
    discard: useCallback(
      (item) => {
        hide(item.id, true)
        runDiscard(item.id)
      },
      [hide, runDiscard]
    ),
    restore: useCallback(
      (item) => {
        const local = registry.get(localAtom)
        registry.set(localAtom, { ...local, added: [...local.added.filter((i) => i.id !== item.id), item] })
        hide(item.id, false)
        runCapture(withId(item, item.id))
      },
      [registry, hide, runCapture]
    )
  }
}

/**
 * For filing: the item leaves the Inbox on screen at once, and is discarded
 * on the API only once its page has it; a change that didn't happen shows it again
 */
function useLeaveAfter() {
  const hide = useHide()
  const runDiscard = useAtomSet(discardAtom)
  return useCallback(
    async (item: InboxItem | null, change: () => Promise<string | null>): Promise<string | null> => {
      if (item) hide(item.id, true)
      const message = await change()
      if (item) {
        if (message === null) runDiscard(item.id)
        else hide(item.id, false)
      }
      return message
    },
    [hide, runDiscard]
  )
}

/** Where an item goes: a page of one of the learner's maps */
export interface PageTarget {
  readonly projectId: string
  readonly pageId: string
}

export type FileResult = { readonly ok: true; readonly title: string } | { readonly ok: false; readonly message: string }

/** The commands that take a map from one state to another, for what the Inbox changes in it */
function pageCommands(before: Project, after: Project): Command[] {
  const old = new Map(before.pages.map((p) => [p.id, p]))
  return after.pages.flatMap((page): Command[] => {
    const was = old.get(page.id)
    if (!was) return [{ _tag: "CreatePage", page: { id: page.id, title: page.title } }, { _tag: "UpdatePage", pageId: page.id, edit: { content: page.content } }]
    return was.content === page.content ? [] : [{ _tag: "UpdatePage", pageId: page.id, edit: { content: page.content } }]
  })
}

/**
 * Applies a change made from the Inbox to a map through its session, and
 * resolves once the API has it; the message to show when it didn't happen
 */
function useChangeMap() {
  const open = useOpenProject()
  const t = useT()
  return useCallback(
    async <E>(target: PageTarget, change: (project: Project) => Effect.Effect<Project, E>): Promise<string | null> => {
      const handle = await open(target.projectId)
      if (!handle) return t("inbox.errors.pathGone")
      const before = handle.project()
      const exit = Effect.runSyncExit(change(before))
      if (Exit.isFailure(exit)) return t("inbox.errors.pageGone")
      for (const command of pageCommands(before, exit.value)) handle.dispatch(command)
      return (await handle.saved()) ? null : t("inbox.errors.notFiled")
    },
    [open, t]
  )
}

/** Appends an item to a page; with an Inbox item, takes it out of the Inbox once the page has it */
export function useFileItem(): (item: CaptureInput & { readonly id?: InboxItemId }, target: PageTarget) => Promise<FileResult> {
  const change = useChangeMap()
  const leaveAfter = useLeaveAfter()
  return useCallback(
    async (item, target) => {
      let title = ""
      const message = await leaveAfter(item.id !== undefined ? (item as InboxItem) : null, () =>
        change(target, (project) => {
          title = project.pages.find((p) => p.id === target.pageId)?.title ?? ""
          return fileItem(project, PageId.make(target.pageId), item)
        })
      )
      return message === null ? { ok: true, title } : { ok: false, message }
    },
    [change, leaveAfter]
  )
}

/** Makes an item a page of its own, linked from the chosen page; takes it out of the Inbox once the map has it */
export function useMakePage(): (item: InboxItem, from: PageTarget) => Promise<FileResult & { readonly pageId?: string }> {
  const change = useChangeMap()
  const leaveAfter = useLeaveAfter()
  const t = useT()
  return useCallback(
    async (item, from) => {
      const id = newPageId()
      let title = ""
      const message = await leaveAfter(item, () =>
        change(from, (project) =>
          makePage(project, PageId.make(from.pageId), item, id, { untitled: t("inbox.makePage.untitled") }).pipe(
            Effect.map((made) => {
              title = made.title
              return made.project
            })
          )
        )
      )
      return message === null ? { ok: true, title, pageId: id } : { ok: false, message }
    },
    [change, leaveAfter, t]
  )
}
