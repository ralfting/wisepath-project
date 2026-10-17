"use client"

import { useContext, useSyncExternalStore } from "react"
import { AsyncResult, Atom } from "effect/reactivity"
import { RegistryContext, useAtomValue } from "@effect/atom-react"
import { PathId } from "@wisepath/domain/paths"
import type { MemberRole, Path, PathShare, PathVisibility } from "@wisepath/domain/paths"
import type { ActionResult } from "../actionResult"
import { ReactivityKeys, appRuntime } from "../runtime"
import { useAction } from "../useAction"
import * as actions from "./actions"
import * as programs from "./programs"

/**
 * Sharing hooks for the Share dialog and the paths from others. Changes go
 * through Server Actions; what the client holds is read again after each.
 */

const sharesAtom = Atom.family((id: PathId) =>
  appRuntime.atom(programs.listShares(id)).pipe(Atom.withReactivity([ReactivityKeys.shares]))
)

/**
 * A visibility just set, shown before the open map hears of it: the map's sync session holds the path as it was
 * read, and the dialog should not flip back when opened again
 */
const visibilityAtom = Atom.family((_: PathId) => Atom.keepAlive(Atom.make<PathVisibility | null>(null)))

const noSubscription = () => () => {}
const useHydrated = () => useSyncExternalStore(noSubscription, () => true, () => false)

export type SharesState =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "ready"; readonly shares: ReadonlyArray<PathShare> }

/** The people the owner invited to a map */
export function useShares(pathId: string): SharesState {
  const hydrated = useHydrated()
  const result = useAtomValue(sharesAtom(PathId.make(pathId)))
  if (!hydrated) return { status: "loading" }
  return AsyncResult.match(result, {
    onInitial: (): SharesState => ({ status: "loading" }),
    onFailure: (): SharesState => ({ status: "failed" }),
    onSuccess: ({ value }): SharesState => ({ status: "ready", shares: value })
  })
}

/** Invites an account by email, or changes their role; resolves to them, or to the message to show */
export function useSharePath(): (pathId: string, email: string, role: MemberRole) => Promise<ActionResult<PathShare>> {
  return useAction(actions.sharePath, [ReactivityKeys.shares])
}

/** Takes someone off a map; resolves to null, or to the message to show */
export function useUnsharePath(): (pathId: string, userId: string) => Promise<string | null> {
  const unshare = useAction(actions.unsharePath, [ReactivityKeys.shares])
  return async (pathId, userId) => {
    const result = await unshare(pathId, userId)
    return result.ok ? null : result.message
  }
}

/** The map's visibility as the learner last set it */
export function useVisibility(path: Path): PathVisibility {
  return useAtomValue(visibilityAtom(path.id)) ?? path.visibility
}

/** Makes a map public or private; resolves to null, or to the message to show */
export function useSetVisibility(): (pathId: string, visibility: PathVisibility) => Promise<string | null> {
  const set = useAction(actions.setPathVisibility, [ReactivityKeys.paths])
  const registry = useContext(RegistryContext)
  return async (pathId, visibility) => {
    const result = await set(pathId, visibility)
    if (!result.ok) return result.message
    registry.set(visibilityAtom(PathId.make(pathId)), visibility)
    return null
  }
}

/** Leaves a map from others; resolves to null, or to the message to show */
export function useLeavePath(): (pathId: string) => Promise<string | null> {
  const leave = useAction(actions.leavePath, [ReactivityKeys.paths])
  return async (pathId) => {
    const result = await leave(pathId)
    return result.ok ? null : result.message
  }
}
