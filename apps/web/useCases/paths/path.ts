"use client"

import { useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react"
import { Cause, Effect, Exit, Option } from "effect"
import { AsyncResult, Atom } from "effect/reactivity"
import { RegistryContext, useAtomSet, useAtomValue } from "@effect/atom-react"
import type { AtomRegistry } from "effect/reactivity"
import { PageId, PathId, addBranch, findPageByTitle, renameLinks, summarize, unlinkPages } from "@wisepath/domain/paths"
import type { LinkPreview, Page, PageColor, PageIcon, Path, PathKind, PathSummary } from "@wisepath/domain/paths"
import { useT } from "@/i18n/I18nProvider"
import { ReactivityKeys, appRuntime } from "../runtime"
import { messageFor } from "../messages"
import { useDomainMessage } from "../validation"
import * as programs from "./programs"
import { openPathSession } from "./sync"
import type { Command, PathSession, SyncState } from "./sync"

/**
 * Path use cases for the map, the page panel and the editor.
 * An open map is a sync session (sync.ts): edits show at once and are saved
 * to the WisePath API in the background.
 */

/** One session per open map, kept while the app runs so going back is instant */
const sessionAtom = Atom.family((id: PathId) => Atom.keepAlive(appRuntime.atom(openPathSession(id))))

/** The session's state as an atom, made once per session */
const stateAtoms = new WeakMap<PathSession, Atom.Atom<SyncState>>()
const stateAtomOf = (session: PathSession) => {
  let atom = stateAtoms.get(session)
  if (!atom) {
    atom = Atom.subscriptionRef(session.state)
    stateAtoms.set(session, atom)
  }
  return atom
}

/** Maps opened in this tab, so the list of maps shows their latest progress without asking the API again */
const openedAtom = Atom.keepAlive(Atom.make(new Set<PathId>() as ReadonlySet<PathId>))

const pathsAtom = appRuntime
  .atom(programs.listPaths)
  .pipe(Atom.withReactivity([ReactivityKeys.paths, ReactivityKeys.session]))

const pathsViewAtom = Atom.make((get): ReadonlyArray<PathSummary> | null => {
  const result = get(pathsAtom)
  if (!AsyncResult.isSuccess(result)) return null
  const opened = get(openedAtom)
  return result.value.map((summary) => {
    if (!opened.has(summary.id)) return summary
    const session = get(sessionAtom(summary.id))
    return AsyncResult.isSuccess(session) ? summarize(get(stateAtomOf(session.value)).path) : summary
  })
})

const createPathAtom = appRuntime.fn(programs.createPath, { reactivityKeys: [ReactivityKeys.paths] })
const removePathAtom = appRuntime.fn(programs.removePath, { reactivityKeys: [ReactivityKeys.paths] })
const setPathKindAtom = appRuntime.fn(programs.setPathKind, { reactivityKeys: [ReactivityKeys.paths] })
const linkPreviewAtom = Atom.family((url: string) => appRuntime.atom(programs.previewLink(url)))

/**
 * A title being edited: the page's title changes with every key, but its
 * [[links]] are rewritten once, when editing ends. Until then the map shows
 * them as already renamed, so the page doesn't look cut off (an orphan)
 */
interface Renaming {
  readonly pageId: PageId
  readonly from: string
}
const renamingAtom = Atom.family((_: PathId) => Atom.keepAlive(Atom.make<Renaming | null>(null)))

/** The map as it will be once the title being edited is done: its old [[links]] point at the new one */
const withRename = (path: Path, renaming: Renaming | null): Path => {
  const page = renaming && path.pages.find((p) => p.id === renaming.pageId)
  return page ? renameLinks(path, renaming.from, page.title) : path
}

/** Nothing to show yet while the session's atom is still loading */
const loadingState: Atom.Atom<{ readonly path: Path | null } & Omit<SyncState, "path">> = Atom.make({
  path: null,
  status: "saved",
  notice: null
})

/**
 * False on the server and during hydration, true afterwards. Maps load in the
 * browser (the session cookie belongs to the API), so both renders must agree on "loading".
 */
const noSubscription = () => () => {}
const useHydrated = () => useSyncExternalStore(noSubscription, () => true, () => false)

/** Page ids come in as plain strings (from the URL or the map) and are branded here */
export interface PathActions {
  /** Edits a page; a title another page has is ignored, so check titleTaken first */
  updatePage: (pageId: string, patch: Partial<Pick<Page, "title" | "content" | "studied">>) => void
  /** A page's title starts being edited: its links show the new title as it is typed */
  beginRename: (pageId: string) => void
  /** After a page was renamed to newTitle: rewrites the [[oldTitle]] links across the map, ending the rename */
  renameLinks: (oldTitle: string, newTitle: string) => void
  /** Creates the page a [[link]] points to; the link connects it */
  createPage: (title: string) => Page
  /**
   * Adds a page branching from another (the map's +): a new page, or the one a taken name belongs to, linked at
   * the end of the parent's text. Null when nothing changed (a blank name, the parent's own, a page it links
   * already); else the page, whether it is new, and an undo that puts the parent back as it was
   */
  addBranch: (parentId: string, title: string) => { page: Page; created: boolean; undo: () => void } | null
  /** Removes one page; pages only it reached become orphans; the root stays */
  deletePage: (pageId: string) => void
  /** Shows a page as a module or not, and sets its colour and icon */
  setLook: (pageId: string, look: { module?: boolean; color?: PageColor; icon?: PageIcon }) => void
  /** The line under the map's title */
  setDescription: (description: string) => void
  /** Turns the map into a study or a learning path; the studied marks stay */
  setKind: (kind: PathKind) => void
}

export type PathState =
  | { readonly status: "loading" }
  | { readonly status: "notFound" }
  | { readonly status: "unavailable" }
  | { readonly status: "ready"; readonly path: Path }

/** Whether the latest changes reached the API */
export interface SaveState {
  readonly status: SyncState["status"]
  /** Why a change was undone, if the API refused one, in the current language */
  readonly notice: string | null
}

/** One map for editing: its current state, whether it is saved, and the actions that change it */
export function usePath(pathId: string): { state: PathState; save: SaveState; actions: PathActions } {
  const id = PathId.make(pathId)
  const registry = useContext(RegistryContext)
  const hydrated = useHydrated()
  const session = useAtomValue(sessionAtom(id))
  const ready = hydrated && AsyncResult.isSuccess(session) ? session.value : null
  const sync = useAtomValue(ready ? stateAtomOf(ready) : loadingState)
  const renaming = useAtomValue(renamingAtom(id))
  const path = useMemo(() => sync.path && withRename(sync.path, renaming), [sync.path, renaming])

  // Count this map as open, so the list of maps reflects its edits
  useEffect(() => {
    if (!ready) return
    const opened = registry.get(openedAtom)
    if (!opened.has(id)) registry.set(openedAtom, new Set([...opened, id]))
  }, [ready, registry, id])

  const dispatch = (command: Command) => ready?.dispatch(command) ?? false
  const current = () => (ready ? registry.get(stateAtomOf(ready)).path : undefined)

  const actions: PathActions = {
    updatePage: (pageId, patch) => dispatch({ _tag: "UpdatePage", pageId: PageId.make(pageId), edit: patch }),
    beginRename: (pageId) => {
      const page = current()?.pages.find((p) => p.id === pageId)
      if (page) registry.set(renamingAtom(id), { pageId: page.id, from: page.title })
    },
    renameLinks: (oldTitle, newTitle) => {
      registry.set(renamingAtom(id), null)
      const page = findPageByTitle(current()?.pages ?? [], newTitle)
      if (!page || oldTitle.trim() === newTitle.trim()) return
      dispatch({ _tag: "UpdatePage", pageId: page.id, edit: { title: page.title, previousTitle: oldTitle } })
    },
    createPage: (title) => {
      const id = programs.newPageId()
      dispatch({ _tag: "CreatePage", page: { id, title: title.trim() } })
      const pages = current()?.pages ?? []
      // A title that exists already opens that page instead
      return (pages.find((p) => p.id === id) ?? findPageByTitle(pages, title))!
    },
    addBranch: (parentId, title) => {
      const path = current()
      const parent = path?.pages.find((p) => p.id === parentId)
      if (!path || !parent) return null
      const exit = Effect.runSyncExit(addBranch(path, parent.id, title, programs.newPageId()))
      if (Exit.isFailure(exit) || !exit.value.page || exit.value.path === path) return null
      const { page, created } = exit.value
      const content = exit.value.path.pages.find((p) => p.id === parent.id)!.content
      if (created) dispatch({ _tag: "CreatePage", page: { id: page.id, title: page.title } })
      if (content !== parent.content) dispatch({ _tag: "UpdatePage", pageId: parent.id, edit: { content } })
      const undo = () => {
        dispatch({ _tag: "UpdatePage", pageId: parent.id, edit: { content: parent.content } })
        if (created) dispatch({ _tag: "RemovePage", pageId: page.id })
      }
      return { page, created, undo }
    },
    // Links to the page become plain text first, so no page points at one that is gone
    deletePage: (pageId) => {
      const path = current()
      const page = path?.pages.find((p) => p.id === pageId)
      if (path && page) {
        for (const p of unlinkPages(path, page.title)) {
          if (p.id !== page.id) dispatch({ _tag: "UpdatePage", pageId: p.id, edit: { content: p.content } })
        }
      }
      dispatch({ _tag: "RemovePage", pageId: PageId.make(pageId) })
    },
    setLook: (pageId, look) => dispatch({ _tag: "UpdatePage", pageId: PageId.make(pageId), edit: look }),
    setDescription: (description) => dispatch({ _tag: "UpdatePath", edit: { description } }),
    setKind: (kind) => dispatch({ _tag: "UpdatePath", edit: { kind } })
  }

  // The same object until what it says changes: lists built from it (a picker's pages) keep their marked row
  const state = useMemo((): PathState => {
    if (!hydrated) return { status: "loading" }
    if (path) return { status: "ready", path }
    return AsyncResult.match(session, {
      onInitial: (): PathState => ({ status: "loading" }),
      onFailure: ({ cause }): PathState =>
        Option.exists(Cause.findErrorOption(cause), (error) => error._tag === "PathNotFound")
          ? { status: "notFound" }
          : { status: "unavailable" },
      onSuccess: (): PathState => ({ status: "loading" })
    })
  }, [hydrated, path, session])

  // Leaving with changes still on their way asks first
  const unsaved = sync.status !== "saved"
  useEffect(() => {
    if (!unsaved) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [unsaved])

  const t = useT()
  return { state, save: { status: sync.status, notice: sync.notice && t(`home.save.notice.${sync.notice}`) }, actions }
}

/** Every map, for the list of maps and the sidebar; null until loaded */
export function usePaths(): ReadonlyArray<PathSummary> | null {
  const hydrated = useHydrated()
  const paths = useAtomValue(pathsViewAtom)
  return hydrated ? paths : null
}

/** Result of a map action: the message to show when it failed */
export type PathActionResult<A> = { readonly ok: true; readonly value: A } | { readonly ok: false; readonly message: string }

/** Makes a new map, a study unless said otherwise; resolves to it, or to the message to show */
export function useCreatePath(): (title: string, kind?: PathKind) => Promise<PathActionResult<Path>> {
  const run = useAtomSet(createPathAtom, { mode: "promiseExit" })
  const t = useT()
  const domain = useDomainMessage()
  return async (title, kind = "study") => {
    const exit = await run({ title, kind })
    if (exit._tag === "Success") return { ok: true, value: exit.value }
    const unavailable = t("common.errors.unavailable")
    return { ok: false, message: domain(messageFor(exit, { PathsUnavailable: unavailable }, t("common.errors.generic"))) ?? unavailable }
  }
}

/** Deletes a map with all its pages; resolves to null, or to the message to show */
export function useRemovePath(): (pathId: string) => Promise<string | null> {
  const run = useAtomSet(removePathAtom, { mode: "promiseExit" })
  const t = useT()
  return async (pathId) =>
    messageFor(await run(PathId.make(pathId)), { PathsUnavailable: t("common.errors.unavailable") }, t("common.errors.generic"))
}

export type LinkPreviewState =
  | { readonly status: "loading" }
  | { readonly status: "none" }
  | { readonly status: "ready"; readonly preview: LinkPreview }

/** Preview of an external link; looked up once per URL */
export function useLinkPreview(url: string): LinkPreviewState {
  return useAtomValue(linkPreviewAtom(url), (result): LinkPreviewState =>
    AsyncResult.isSuccess(result)
      ? Option.match(result.value, {
          onNone: () => ({ status: "none" }),
          onSome: (preview) => ({ status: "ready", preview })
        })
      : AsyncResult.isFailure(result)
        ? { status: "none" }
        : { status: "loading" }
  )
}

/**
 * Looks up previews outside React (the editor's compact links): the same
 * lookups, and the same cache, as useLinkPreview. Resolves to null when a page
 * can't be previewed
 */
export function useLinkPreviewLoader(): (url: string) => Promise<LinkPreview | null> {
  const registry = useContext(RegistryContext)
  return useCallback(
    (url) =>
      new Promise((resolve) => {
        const atom = linkPreviewAtom(url)
        const settle = (result: AsyncResult.AsyncResult<Option.Option<LinkPreview>, unknown>) => {
          if (AsyncResult.isSuccess(result)) resolve(Option.getOrNull(result.value))
          else if (AsyncResult.isFailure(result)) resolve(null)
          else return false
          return true
        }
        let stop = () => {}
        let settled = false
        stop = registry.subscribe(atom, (result) => {
          if (!settled && settle(result)) {
            settled = true
            queueMicrotask(stop)
          }
        }, { immediate: true })
        if (settled) stop()
      }),
    [registry]
  )
}

/**
 * Turns any map into a study or a learning path, from the list of maps. A map
 * open in this tab changes through its session, so what it shows stays in step;
 * another is changed through the API. Resolves to null, or to the message to show
 */
export function useSetPathKind(): (pathId: string, kind: PathKind) => Promise<string | null> {
  const registry = useContext(RegistryContext)
  const run = useAtomSet(setPathKindAtom, { mode: "promiseExit" })
  const t = useT()
  return async (pathId, kind) => {
    const id = PathId.make(pathId)
    if (registry.get(openedAtom).has(id)) {
      const session = registry.get(sessionAtom(id))
      if (AsyncResult.isSuccess(session) && session.value.dispatch({ _tag: "UpdatePath", edit: { kind } })) return null
    }
    return messageFor(
      await run({ id, kind }),
      { PathsUnavailable: t("common.errors.unavailable"), PathNotFound: t("home.errors.pathGone") },
      t("common.errors.generic")
    )
  }
}

/** Resolves with an atom's first settled value: its success, or null when it fails */
function settledValue<A>(registry: AtomRegistry.AtomRegistry, atom: Atom.Atom<AsyncResult.AsyncResult<A, unknown>>): Promise<A | null> {
  return new Promise((resolve) => {
    let settled = false
    let stop = () => {}
    stop = registry.subscribe(atom, (result) => {
      if (settled || AsyncResult.isInitial(result) || result.waiting) return
      settled = true
      resolve(AsyncResult.isSuccess(result) ? result.value : null)
      queueMicrotask(stop)
    }, { immediate: true })
    if (settled) stop()
  })
}

/** A map changed from outside its own screen (filing from the Inbox), through the same session as the map */
export interface OpenPath {
  /** The map as it is now, with the changes on their way */
  readonly path: () => Path
  /** Applies a change right away and sends it; false when it can't apply */
  readonly dispatch: (command: Command) => boolean
  /** Resolves once every change so far reached the API: true, or false when the API refused one */
  readonly saved: () => Promise<boolean>
}

/** Opens any of the learner's maps for changes, loading it when it isn't open; null when it can't be loaded */
export function useOpenPath(): (pathId: string) => Promise<OpenPath | null> {
  const registry = useContext(RegistryContext)
  return useCallback(
    async (pathId) => {
      const id = PathId.make(pathId)
      const session = await settledValue(registry, sessionAtom(id))
      if (!session) return null
      const opened = registry.get(openedAtom)
      if (!opened.has(id)) registry.set(openedAtom, new Set([...opened, id]))
      const state = stateAtomOf(session)
      return {
        path: () => registry.get(state).path,
        dispatch: session.dispatch,
        saved: () =>
          new Promise<boolean>((resolve) => {
            let done = false
            let stop = () => {}
            stop = registry.subscribe(state, (sync) => {
              if (done || sync.status !== "saved") return
              done = true
              resolve(sync.notice === null)
              queueMicrotask(stop)
            }, { immediate: true })
            if (done) stop()
          })
      }
    },
    [registry]
  )
}
