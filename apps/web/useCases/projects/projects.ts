"use client"

import { useSyncExternalStore } from "react"
import { AsyncResult, Atom } from "effect/reactivity"
import { useAtomValue } from "@effect/atom-react"
import type { Project } from "@wisepath/domain/projects"
import type { ActionResult } from "../actionResult"
import { ReactivityKeys, appRuntime } from "../runtime"
import { useAction } from "../useAction"
import * as actions from "./actions"
import * as programs from "./programs"

/**
 * Project hooks for the list of paths, which groups them by project. Changes
 * go through Server Actions; the list the client holds is read again after each.
 */

const listAtom = appRuntime
  .atom(programs.listProjects)
  .pipe(Atom.withReactivity([ReactivityKeys.projects, ReactivityKeys.session]))

const noSubscription = () => () => {}
const useHydrated = () => useSyncExternalStore(noSubscription, () => true, () => false)

/** Every project, the default first; null until loaded */
export function useProjects(): ReadonlyArray<Project> | null {
  const hydrated = useHydrated()
  const projects = useAtomValue(listAtom, (result) => (AsyncResult.isSuccess(result) ? result.value : null))
  return hydrated ? projects : null
}

/** Makes a project; resolves to it, or to the message to show */
export function useCreateProject(): (name: string) => Promise<ActionResult<Project>> {
  return useAction(actions.createProject, [ReactivityKeys.projects])
}

/** Renames a project; resolves to null, or to the message to show */
export function useRenameProject(): (projectId: string, name: string) => Promise<string | null> {
  const rename = useAction(actions.renameProject, [ReactivityKeys.projects])
  return async (projectId, name) => {
    const result = await rename(projectId, name)
    return result.ok ? null : result.message
  }
}

/** Deletes a project, its paths going to the default one; resolves to null, or to the message to show */
export function useRemoveProject(): (projectId: string) => Promise<string | null> {
  // Deleting one moves its paths, so the paths are read again too
  const remove = useAction(actions.removeProject, [ReactivityKeys.projects, ReactivityKeys.paths])
  return async (projectId) => {
    const result = await remove(projectId)
    return result.ok ? null : result.message
  }
}
