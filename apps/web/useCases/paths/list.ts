"use client"

import { useContext } from "react"
import { AsyncResult, Atom } from "effect/reactivity"
import { RegistryContext, useAtomSet, useAtomValue } from "@effect/atom-react"
import { PathId, summarize } from "@wisepath/domain/paths"
import type { Path, PathKind, PathSummary } from "@wisepath/domain/paths"
import { ProjectId } from "@wisepath/domain/projects"
import { useT } from "@/i18n/I18nProvider"
import { ReactivityKeys, appRuntime } from "../runtime"
import { messageFor } from "../messages"
import { useHydrated } from "../useHydrated"
import { useDomainMessage } from "../validation"
import * as programs from "./programs"
import { openedAtom, sessionAtom, stateAtomOf } from "./sessions"

/** The list of maps (the paths page, the sidebar) and what is done to a map from it: make, move, delete, switch kind */

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

const createPathAtom = appRuntime.fn(programs.createPath, { reactivityKeys: [ReactivityKeys.paths] })
const removePathAtom = appRuntime.fn(programs.removePath, { reactivityKeys: [ReactivityKeys.paths] })
const setPathKindAtom = appRuntime.fn(programs.setPathKind, { reactivityKeys: [ReactivityKeys.paths] })
const movePathAtom = appRuntime.fn(programs.movePath, { reactivityKeys: [ReactivityKeys.paths] })

/** Every map, for the list of maps and the sidebar; null until loaded */
export function usePaths(): ReadonlyArray<PathSummary> | null {
  const hydrated = useHydrated()
  const paths = useAtomValue(pathsViewAtom)
  return hydrated ? paths : null
}

/** Result of a map action: the message to show when it failed */
export type PathActionResult<A> = { readonly ok: true; readonly value: A } | { readonly ok: false; readonly message: string }

/** Makes a new map in a project, a study unless said otherwise; resolves to it, or to the message to show */
export function useCreatePath(): (title: string, kind: PathKind, projectId: string) => Promise<PathActionResult<Path>> {
  const run = useAtomSet(createPathAtom, { mode: "promiseExit" })
  const t = useT()
  const domain = useDomainMessage()
  return async (title, kind, projectId) => {
    const exit = await run({ title, kind, projectId: ProjectId.make(projectId) })
    if (exit._tag === "Success") return { ok: true, value: exit.value }
    const unavailable = t("common.errors.unavailable")
    const messages = { PathsUnavailable: unavailable, ProjectNotFound: t("home.errors.projectGone") }
    return { ok: false, message: domain(messageFor(exit, messages, t("common.errors.generic"))) ?? unavailable }
  }
}

/**
 * Files a map in another project. The list shows it there at once; if the API
 * refuses, it goes back to where it was. Resolves to null, or to the message to show
 */
export function useMovePath(): (pathId: string, projectId: string) => Promise<string | null> {
  const registry = useContext(RegistryContext)
  const run = useAtomSet(movePathAtom, { mode: "promiseExit" })
  const t = useT()
  return async (pathId, projectId) => {
    const id = PathId.make(pathId)
    const before = registry.get(movesAtom)
    registry.set(movesAtom, new Map(before).set(id, ProjectId.make(projectId)))
    const message = messageFor(
      await run({ id, projectId: ProjectId.make(projectId) }),
      {
        PathsUnavailable: t("common.errors.unavailable"),
        PathNotFound: t("home.errors.pathGone"),
        ProjectNotFound: t("home.errors.projectGone")
      },
      t("common.errors.generic")
    )
    if (message) {
      // Back to where it was: an earlier move still waiting, or what the API listed
      const now = new Map(registry.get(movesAtom))
      const earlier = before.get(id)
      if (earlier) now.set(id, earlier)
      else now.delete(id)
      registry.set(movesAtom, now)
    }
    return message
  }
}

/** Deletes a map with all its pages; resolves to null, or to the message to show */
export function useRemovePath(): (pathId: string) => Promise<string | null> {
  const run = useAtomSet(removePathAtom, { mode: "promiseExit" })
  const t = useT()
  return async (pathId) =>
    messageFor(await run(PathId.make(pathId)), { PathsUnavailable: t("common.errors.unavailable") }, t("common.errors.generic"))
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
