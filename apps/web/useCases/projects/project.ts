"use client"

import { useCallback, useContext, useSyncExternalStore } from "react"
import { Cause, Option } from "effect"
import { AsyncResult, Atom } from "effect/reactivity"
import { RegistryContext, useAtomSet, useAtomValue } from "@effect/atom-react"
import {
  PageId,
  ProjectId,
  createPage,
  deletePage,
  renameLinks,
  setDescription,
  setLook,
  updatePage
} from "@wisepath/domain/projects"
import type { LinkPreview, Page, PageColor, PageIcon, Project } from "@wisepath/domain/projects"
import { ReactivityKeys, appRuntime } from "../runtime"
import * as programs from "./programs"

/**
 * Project use cases for the map, the page panel and the editor.
 * The project loads from storage once; edits apply domain rules to an
 * in-memory draft right away (typing stays instant) and are saved shortly after.
 */

const loadedAtom = Atom.family((id: ProjectId) => appRuntime.atom(programs.loadProject(id)))
const draftAtom = Atom.family((_id: ProjectId) => Atom.keepAlive(Atom.make(Option.none<Project>())))
const saveAtom = Atom.family((_: ProjectId) =>
  appRuntime.fn(programs.saveProject, { reactivityKeys: [ReactivityKeys.projects] })
)
const projectsAtom = appRuntime.atom(programs.listProjects).pipe(Atom.withReactivity([ReactivityKeys.projects]))
const linkPreviewAtom = Atom.family((url: string) => appRuntime.atom(programs.previewLink(url)))

/**
 * False on the server and during hydration, true afterwards. Projects live in
 * device storage the server can't see, so both renders must agree on "loading".
 */
const noSubscription = () => () => {}
const useHydrated = () => useSyncExternalStore(noSubscription, () => true, () => false)

/** Page ids come in as plain strings (from the URL or the map) and are branded here */
export interface ProjectActions {
  /** Edits a page; a title another page has is ignored, so check titleTaken first */
  updatePage: (pageId: string, patch: Partial<Pick<Page, "title" | "content" | "studied">>) => void
  /** Rewrites [[Old]] links across the project after a rename */
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

/** One project for editing: its current state and the actions that change it */
export function useProject(projectId: string): { state: ProjectState; actions: ProjectActions } {
  const id = ProjectId.make(projectId)
  const registry = useContext(RegistryContext)
  const loaded = useAtomValue(loadedAtom(id))
  const draft = useAtomValue(draftAtom(id))
  const save = useAtomSet(saveAtom(id))
  const hydrated = useHydrated()

  const current = (): Project | undefined => {
    const d = registry.get(draftAtom(id))
    if (Option.isSome(d)) return d.value
    const l = registry.get(loadedAtom(id))
    return AsyncResult.isSuccess(l) ? l.value : undefined
  }

  const commit = useCallback(
    (next: Project) => {
      registry.set(draftAtom(id), Option.some(next))
      save(next)
    },
    [registry, id, save]
  )

  const change = (f: (project: Project) => Project) => {
    const project = current()
    if (project) commit(f(project))
  }

  const actions: ProjectActions = {
    updatePage: (pageId, patch) => change((p) => updatePage(p, PageId.make(pageId), patch)),
    renameLinks: (oldTitle, newTitle) => change((p) => renameLinks(p, oldTitle, newTitle)),
    createPage: (title) => {
      const result = createPage(current()!, title, programs.newPageId())
      commit(result.project)
      return result.page
    },
    deletePage: (pageId) => change((p) => deletePage(p, PageId.make(pageId))),
    setLook: (pageId, look) => change((p) => setLook(p, PageId.make(pageId), look)),
    setDescription: (description) => change((p) => setDescription(p, description))
  }

  let state: ProjectState
  if (!hydrated) state = { status: "loading" }
  else if (Option.isSome(draft)) state = { status: "ready", project: draft.value }
  else
    state = AsyncResult.match(loaded, {
      onInitial: (): ProjectState => ({ status: "loading" }),
      onFailure: ({ cause }): ProjectState =>
        Option.exists(Cause.findErrorOption(cause), (error) => error._tag === "ProjectNotFound")
          ? { status: "notFound" }
          : { status: "unavailable" },
      onSuccess: ({ value }): ProjectState => ({ status: "ready", project: value })
    })

  return { state, actions }
}

/** Every project, for the projects page; refreshed after each save */
export function useProjects(): ReadonlyArray<Project> | null {
  const hydrated = useHydrated()
  const projects = useAtomValue(projectsAtom, (result) => (AsyncResult.isSuccess(result) ? result.value : null))
  return hydrated ? projects : null
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
