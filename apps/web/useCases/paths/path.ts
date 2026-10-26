"use client"

import { useContext, useEffect, useMemo } from "react"
import { Cause, Effect, Exit, Option } from "effect"
import { AsyncResult, Atom } from "effect/reactivity"
import { RegistryContext, useAtomValue } from "@effect/atom-react"
import { PageId, PathId, addBranch, findPageByTitle, moveBranch, renameLinks, unlinkPages } from "@wisepath/domain/paths"
import type { NoteId, NoteText, Page, PageColor, PageIcon, Path, PathKind } from "@wisepath/domain/paths"
import { useT } from "@/i18n/I18nProvider"
import { useHydrated } from "../useHydrated"
import * as programs from "./programs"
import { openedAtom, sessionAtom, stateAtomOf } from "./sessions"
import type { Command, SyncState } from "./sync"

/**
 * The open map, for the map, the page panel and the editor. An open map is a
 * sync session (sync.ts): edits show at once and are saved to the WisePath API
 * in the background. The list of maps is in list.ts, previews in links.ts.
 */

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

/** Page ids come in as plain strings (from the URL or the map) and are branded here */
export interface PathActions {
  /** Edits a page; a title another page has is ignored, so check titleTaken first */
  updatePage: (pageId: string, patch: Partial<Pick<Page, "title" | "content" | "studied">>) => void
  /** Writes the reader's own note on a page, new or rewritten; make a new one's id with newNoteId */
  writeNote: (pageId: string, noteId: NoteId, text: NoteText) => void
  removeNote: (pageId: string, noteId: NoteId) => void
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
  /** Moves a page to branch from another, by moving its [[link]]; pick the parent from branchTargets */
  moveBranch: (pageId: string, parentId: string) => void
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
    writeNote: (pageId, noteId, text) => dispatch({ _tag: "WriteNote", pageId: PageId.make(pageId), note: { id: noteId, ...text } }),
    removeNote: (pageId, noteId) => dispatch({ _tag: "RemoveNote", pageId: PageId.make(pageId), noteId }),
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
    moveBranch: (pageId, parentId) => {
      const path = current()
      if (!path) return
      const moved = moveBranch(path, PageId.make(pageId), PageId.make(parentId))
      moved.pages.forEach((page, index) => {
        if (page !== path.pages[index]) dispatch({ _tag: "UpdatePage", pageId: page.id, edit: { content: page.content } })
      })
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
