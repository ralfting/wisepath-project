"use client"

import { useContext } from "react"
import { AsyncResult, Atom } from "effect/reactivity"
import { RegistryContext, useAtomValue } from "@effect/atom-react"
import { PathId, summarize } from "@wisepath/domain/paths"
import type { Path, PathKind, PathSummary } from "@wisepath/domain/paths"
import { ProjectId } from "@wisepath/domain/projects"
import type { ActionResult } from "../actionResult"
import { ReactivityKeys, appRuntime } from "../runtime"
import { useAction } from "../useAction"
import { useHydrated } from "../useHydrated"
import * as actions from "./actions"
import * as programs from "./programs"
import { openedAtom, sessionAtom, stateAtomOf } from "./sessions"

/** The list of maps (the paths page, the sidebar) and what is done to a map from it: make, move, delete, switch kind, through Server Actions */

const pathsAtom = appRuntime
  .atom(programs.listPaths)
  .pipe(Atom.withReactivity([ReactivityKeys.paths, ReactivityKeys.session]))

/**
 * Moves to another project shown before the API confirms them (dragging a card,
 * or Move to): the path's project as the learner just set it. One the API
 * refuses is taken out again, so the card goes back where it was
 */
const movesAtom = Atom.keepAlive(Atom.make(new Map<PathId, ProjectId>() as ReadonlyMap<PathId, ProjectId>))

const pathsViewAtom = Atom.make((get): ReadonlyArray<PathSummary> | null => {
  const result = get(pathsAtom)
  if (!AsyncResult.isSuccess(result)) return null
  const opened = get(openedAtom)
  const moves = get(movesAtom)
  return result.value.map((listed) => {
    const moved = moves.get(listed.id)
    const summary = moved ? { ...listed, projectId: moved } : listed
    if (!opened.has(summary.id)) return summary
    const session = get(sessionAtom(summary.id))
    return AsyncResult.isSuccess(session) ? summarize(get(stateAtomOf(session.value)).path, summary.projectId, summary.ownerName) : summary
  })
})

/** Every map, for the list of maps and the sidebar; null until loaded */
export function usePaths(): ReadonlyArray<PathSummary> | null {
  const hydrated = useHydrated()
  const paths = useAtomValue(pathsViewAtom)
  return hydrated ? paths : null
}

/** Makes a new map in a project, a study unless said otherwise; resolves to it, or to the message to show */
export function useCreatePath(): (title: string, projectId: string) => Promise<ActionResult<Path>> {
  return useAction(actions.createPath, [ReactivityKeys.paths])
}

/** Copies the sample path for the learner; resolves to it, or to the message to show */
export function useTakeSample(): () => Promise<ActionResult<Path>> {
  return useAction(actions.takeSamplePath, [ReactivityKeys.paths])
}

/**
 * Files a map in another project. The list shows it there at once; if the API
 * refuses, it goes back to where it was. Resolves to null, or to the message to show
 */
export function useMovePath(): (pathId: string, projectId: string) => Promise<string | null> {
  const registry = useContext(RegistryContext)
  const move = useAction(actions.movePath, [ReactivityKeys.paths])
  return async (pathId, projectId) => {
    const id = PathId.make(pathId)
    const before = registry.get(movesAtom)
    registry.set(movesAtom, new Map(before).set(id, ProjectId.make(projectId)))
    const result = await move(pathId, projectId)
    if (result.ok) return null
    // Back to where it was: an earlier move still waiting, or what the API listed
    const now = new Map(registry.get(movesAtom))
    const earlier = before.get(id)
    if (earlier) now.set(id, earlier)
    else now.delete(id)
    registry.set(movesAtom, now)
    return result.message
  }
}

/** Deletes a map with all its pages; resolves to null, or to the message to show */
export function useRemovePath(): (pathId: string) => Promise<string | null> {
  const remove = useAction(actions.removePath, [ReactivityKeys.paths])
  return async (pathId) => {
    const result = await remove(pathId)
    return result.ok ? null : result.message
  }
}

/**
 * Turns any map into a study or a learning path, from the list of maps. A map
 * open in this tab changes through its session, so what it shows stays in step;
 * another is changed through the API. Resolves to null, or to the message to show
 */
export function useSetPathKind(): (pathId: string, kind: PathKind) => Promise<string | null> {
  const registry = useContext(RegistryContext)
  const setKind = useAction(actions.setPathKind, [ReactivityKeys.paths])
  return async (pathId, kind) => {
    const id = PathId.make(pathId)
    if (registry.get(openedAtom).has(id)) {
      const session = registry.get(sessionAtom(id))
      if (AsyncResult.isSuccess(session) && session.value.dispatch({ _tag: "UpdatePath", edit: { kind } })) return null
    }
    const result = await setKind(pathId, kind)
    return result.ok ? null : result.message
  }
}
