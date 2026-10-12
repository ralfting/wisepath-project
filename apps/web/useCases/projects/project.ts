"use client"

import { useCallback, useContext, useSyncExternalStore } from "react"
import { Cause, Option } from "effect"
import { AsyncResult, Atom } from "effect/reactivity"
import { RegistryContext, useAtomSet, useAtomValue } from "@effect/atom-react"
import {
  PageId,
  ProjectId,
  addChildPage,
  addPage,
  deletePage,
  findSampleProject,
  renameLinks,
  setStartPage,
  updatePage
} from "@wisepath/domain/projects"
import type { LinkPreview, Page, Project } from "@wisepath/domain/projects"
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

/** Page ids come in as plain strings (from the URL or the chart) and are branded here */
/**
 * False on the server and during hydration, true afterwards. Projects live in
 * device storage the server can't see, so both renders must agree on "loading".
 */
const noSubscription = () => () => {}
const useHydrated = () => useSyncExternalStore(noSubscription, () => true, () => false)

export interface ProjectActions {
  updatePage: (pageId: string, patch: Partial<Pick<Page, "title" | "content" | "studied">>) => void
  /** Rewrites [[Old]] links across the project after a rename */
  renameLinks: (oldTitle: string, newTitle: string) => void
  /** Adds a page one level below the parent (its [[link]] is written there); no parent makes the start page */
  addChild: (parentId: string | null, title: string) => Page
  /** Adds a page by title without linking it, e.g. from a [[link]] that pointed nowhere yet */
  addPage: (title: string) => Page
  deletePage: (pageId: string) => void
  setStartPage: (pageId: string | null) => void
  /** Throws away local edits and restores the shipped sample */
  reset: () => void
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
    addChild: (parentId, title) => {
      const result = addChildPage(current()!, parentId === null ? null : PageId.make(parentId), title, programs.newPageId())
      commit(result.project)
      return result.page
    },
    addPage: (title) => {
      const result = addPage(current()!, title, programs.newPageId())
      commit(result.project)
      return result.page
    },
    deletePage: (pageId) => change((p) => deletePage(p, PageId.make(pageId))),
    setStartPage: (pageId) => change((p) => setStartPage(p, pageId === null ? null : PageId.make(pageId))),
    reset: () => {
      const sample = findSampleProject(id)
      if (sample) commit(sample)
    }
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
