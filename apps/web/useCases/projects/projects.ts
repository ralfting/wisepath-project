"use client"

import { useSyncExternalStore } from "react"
import { AsyncResult, Atom } from "effect/reactivity"
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { ProjectId } from "@wisepath/domain/projects"
import type { Project } from "@wisepath/domain/projects"
import { useT } from "@/i18n/I18nProvider"
import { ReactivityKeys, appRuntime } from "../runtime"
import { messageFor } from "../messages"
import { useDomainMessage } from "../validation"
import * as programs from "./programs"

/** Project hooks for the list of paths, which groups them by project */

const listAtom = appRuntime
  .atom(programs.listProjects)
  .pipe(Atom.withReactivity([ReactivityKeys.projects, ReactivityKeys.session]))

const createProjectAtom = appRuntime.fn(programs.createProject, { reactivityKeys: [ReactivityKeys.projects] })
const renameProjectAtom = appRuntime.fn(programs.renameProject, { reactivityKeys: [ReactivityKeys.projects] })
// Deleting one moves its paths, so the paths are read again too
const removeProjectAtom = appRuntime.fn(programs.removeProject, { reactivityKeys: [ReactivityKeys.projects, ReactivityKeys.paths] })

const noSubscription = () => () => {}
const useHydrated = () => useSyncExternalStore(noSubscription, () => true, () => false)

/** Every project, the default first; null until loaded */
export function useProjects(): ReadonlyArray<Project> | null {
  const hydrated = useHydrated()
  const projects = useAtomValue(listAtom, (result) => (AsyncResult.isSuccess(result) ? result.value : null))
  return hydrated ? projects : null
}

/** Result of a project action: the message to show when it failed */
export type ProjectActionResult<A> = { readonly ok: true; readonly value: A } | { readonly ok: false; readonly message: string }

/** Makes a project; resolves to it, or to the message to show */
export function useCreateProject(): (name: string) => Promise<ProjectActionResult<Project>> {
  const run = useAtomSet(createProjectAtom, { mode: "promiseExit" })
  const t = useT()
  const domain = useDomainMessage()
  return async (name) => {
    const exit = await run(name)
    if (exit._tag === "Success") return { ok: true, value: exit.value }
    const unavailable = t("common.errors.unavailable")
    return { ok: false, message: domain(messageFor(exit, { ProjectsUnavailable: unavailable }, t("common.errors.generic"))) ?? unavailable }
  }
}

/** Renames a project; resolves to null, or to the message to show */
export function useRenameProject(): (projectId: string, name: string) => Promise<string | null> {
  const run = useAtomSet(renameProjectAtom, { mode: "promiseExit" })
  const t = useT()
  const domain = useDomainMessage()
  return async (projectId, name) =>
    domain(
      messageFor(
        await run({ id: ProjectId.make(projectId), name }),
        { ProjectsUnavailable: t("common.errors.unavailable"), ProjectNotFound: t("home.errors.projectGone") },
        t("common.errors.generic")
      )
    )
}

/** Deletes a project, its paths going to the default one; resolves to null, or to the message to show */
export function useRemoveProject(): (projectId: string) => Promise<string | null> {
  const run = useAtomSet(removeProjectAtom, { mode: "promiseExit" })
  const t = useT()
  return async (projectId) =>
    messageFor(
      await run(ProjectId.make(projectId)),
      { ProjectsUnavailable: t("common.errors.unavailable"), DefaultProjectProtected: t("home.errors.defaultProtected") },
      t("common.errors.generic")
    )
}
