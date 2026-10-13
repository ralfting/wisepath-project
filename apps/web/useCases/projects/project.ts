"use client"

import { useContext, useEffect, useSyncExternalStore } from "react"
import { Cause, Option } from "effect"
import { AsyncResult, Atom } from "effect/reactivity"
import { RegistryContext, useAtomSet, useAtomValue } from "@effect/atom-react"
import { PageId, ProjectId, findPageByTitle, summarize, unlinkPages } from "@wisepath/domain/projects"
import type { LinkPreview, Page, PageColor, PageIcon, Project, ProjectSummary } from "@wisepath/domain/projects"
import { ReactivityKeys, appRuntime } from "../runtime"
import { messageFor } from "../messages"
import * as programs from "./programs"
import { openProjectSession } from "./sync"
import type { Command, ProjectSession, SyncState } from "./sync"

/**
 * Project use cases for the map, the page panel and the editor.
 * An open map is a sync session (sync.ts): edits show at once and are saved
 * to the WisePath API in the background.
 */

/** One session per open map, kept while the app runs so going back is instant */
const sessionAtom = Atom.family((id: ProjectId) => Atom.keepAlive(appRuntime.atom(openProjectSession(id))))

/** The session's state as an atom, made once per session */
const stateAtoms = new WeakMap<ProjectSession, Atom.Atom<SyncState>>()
const stateAtomOf = (session: ProjectSession) => {
  let atom = stateAtoms.get(session)
  if (!atom) {
    atom = Atom.subscriptionRef(session.state)
    stateAtoms.set(session, atom)
  }
  return atom
}

/** Maps opened in this tab, so the list of maps shows their latest progress without asking the API again */
const openedAtom = Atom.keepAlive(Atom.make(new Set<ProjectId>() as ReadonlySet<ProjectId>))

const projectsAtom = appRuntime
  .atom(programs.listProjects)
  .pipe(Atom.withReactivity([ReactivityKeys.projects, ReactivityKeys.session]))

const projectsViewAtom = Atom.make((get): ReadonlyArray<ProjectSummary> | null => {
  const result = get(projectsAtom)
  if (!AsyncResult.isSuccess(result)) return null
  const opened = get(openedAtom)
  return result.value.map((summary) => {
    if (!opened.has(summary.id)) return summary
    const session = get(sessionAtom(summary.id))
    return AsyncResult.isSuccess(session) ? summarize(get(stateAtomOf(session.value)).project) : summary
  })
})

const createProjectAtom = appRuntime.fn(programs.createProject, { reactivityKeys: [ReactivityKeys.projects] })
const removeProjectAtom = appRuntime.fn(programs.removeProject, { reactivityKeys: [ReactivityKeys.projects] })
const linkPreviewAtom = Atom.family((url: string) => appRuntime.atom(programs.previewLink(url)))

/** Nothing to show yet while the session's atom is still loading */
const loadingState: Atom.Atom<{ readonly project: Project | null } & Omit<SyncState, "project">> = Atom.make({
  project: null,
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
export interface ProjectActions {
  /** Edits a page; a title another page has is ignored, so check titleTaken first */
  updatePage: (pageId: string, patch: Partial<Pick<Page, "title" | "content" | "studied">>) => void
  /** After a page was renamed to newTitle: rewrites the [[oldTitle]] links across the map */
  renameLinks: (oldTitle: string, newTitle: string) => void
  /** Creates the page a [[link]] points to; the link connects it */
  createPage: (title: string) => Page
  /** Removes one page; pages only it reached become orphans; the root stays */
  deletePage: (pageId: string) => void
  /** Shows a page as a module or not, and sets its colour and icon */
  setLook: (pageId: string, look: { module?: boolean; color?: PageColor; icon?: PageIcon }) => void
  /** The line under the map's title */
  setDescription: (description: string) => void
}

export type ProjectState =
  | { readonly status: "loading" }
  | { readonly status: "notFound" }
  | { readonly status: "unavailable" }
  | { readonly status: "ready"; readonly project: Project }

/** Whether the latest changes reached the API */
export interface SaveState {
  readonly status: SyncState["status"]
  /** Why a change was undone, if the API refused one */
  readonly notice: string | null
}

/** One map for editing: its current state, whether it is saved, and the actions that change it */
export function useProject(projectId: string): { state: ProjectState; save: SaveState; actions: ProjectActions } {
  const id = ProjectId.make(projectId)
  const registry = useContext(RegistryContext)
  const hydrated = useHydrated()
  const session = useAtomValue(sessionAtom(id))
  const ready = hydrated && AsyncResult.isSuccess(session) ? session.value : null
  const sync = useAtomValue(ready ? stateAtomOf(ready) : loadingState)

  // Count this map as open, so the list of maps reflects its edits
  useEffect(() => {
    if (!ready) return
    const opened = registry.get(openedAtom)
    if (!opened.has(id)) registry.set(openedAtom, new Set([...opened, id]))
  }, [ready, registry, id])

  const dispatch = (command: Command) => ready?.dispatch(command) ?? false
  const current = () => (ready ? registry.get(stateAtomOf(ready)).project : undefined)

  const actions: ProjectActions = {
    updatePage: (pageId, patch) => dispatch({ _tag: "UpdatePage", pageId: PageId.make(pageId), edit: patch }),
    renameLinks: (oldTitle, newTitle) => {
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
    // Links to the page become plain text first, so no page points at one that is gone
    deletePage: (pageId) => {
      const project = current()
      const page = project?.pages.find((p) => p.id === pageId)
      if (project && page) {
        for (const p of unlinkPages(project, page.title)) {
          if (p.id !== page.id) dispatch({ _tag: "UpdatePage", pageId: p.id, edit: { content: p.content } })
        }
      }
      dispatch({ _tag: "RemovePage", pageId: PageId.make(pageId) })
    },
    setLook: (pageId, look) => dispatch({ _tag: "UpdatePage", pageId: PageId.make(pageId), edit: look }),
    setDescription: (description) => dispatch({ _tag: "UpdateProject", edit: { description } })
  }

  let state: ProjectState
  if (!hydrated) state = { status: "loading" }
  else if (sync.project) state = { status: "ready", project: sync.project }
  else
    state = AsyncResult.match(session, {
      onInitial: (): ProjectState => ({ status: "loading" }),
      onFailure: ({ cause }): ProjectState =>
        Option.exists(Cause.findErrorOption(cause), (error) => error._tag === "ProjectNotFound")
          ? { status: "notFound" }
          : { status: "unavailable" },
      onSuccess: (): ProjectState => ({ status: "loading" })
    })

  // Leaving with changes still on their way asks first
  const unsaved = sync.status !== "saved"
  useEffect(() => {
    if (!unsaved) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [unsaved])

  return { state, save: { status: sync.status, notice: sync.notice }, actions }
}

/** Every map, for the list of maps and the sidebar; null until loaded */
export function useProjects(): ReadonlyArray<ProjectSummary> | null {
  const hydrated = useHydrated()
  const projects = useAtomValue(projectsViewAtom)
  return hydrated ? projects : null
}

/** Result of a map action: the message to show when it failed */
export type ProjectActionResult<A> = { readonly ok: true; readonly value: A } | { readonly ok: false; readonly message: string }

const unavailable = "Can't reach WisePath right now. Try again in a moment."

/** Makes a new map; resolves to it, or to the message to show */
export function useCreateProject(): (title: string) => Promise<ProjectActionResult<Project>> {
  const run = useAtomSet(createProjectAtom, { mode: "promiseExit" })
  return async (title) => {
    const exit = await run(title)
    if (exit._tag === "Success") return { ok: true, value: exit.value }
    return { ok: false, message: messageFor(exit, { ProjectsUnavailable: unavailable }) ?? unavailable }
  }
}

/** Deletes a map with all its pages; resolves to null, or to the message to show */
export function useRemoveProject(): (projectId: string) => Promise<string | null> {
  const run = useAtomSet(removeProjectAtom, { mode: "promiseExit" })
  return async (projectId) => messageFor(await run(ProjectId.make(projectId)), { ProjectsUnavailable: unavailable })
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
