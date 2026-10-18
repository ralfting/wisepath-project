"use client"

import { useContext } from "react"
import { AsyncResult, Atom } from "effect/reactivity"
import { RegistryContext, useAtomValue } from "@effect/atom-react"
import { Schema } from "effect"
import { PathId, PublicationRequest, ShareEdit } from "@wisepath/domain/paths"
import type { LinkVisibility, MemberRole, Path, PathVisibility, SharedWith, ShareResult } from "@wisepath/domain/paths"
import type { ActionResult } from "../actionResult"
import { ReactivityKeys, appRuntime } from "../runtime"
import { useHydrated } from "../useHydrated"
import { useAction } from "../useAction"
import * as actions from "./actions"
import * as programs from "./programs"

/**
 * Sharing hooks for the Share dialog and the paths from others. Changes go
 * through Server Actions; what the client holds is read again after each.
 */

/** The share form's rules, the domain's own: a valid email and an access */
export const shareFormSchema = Schema.toStandardSchemaV1(ShareEdit)

/** The publish form's rules, the domain's own: what the path teaches, who it is for, its language */
export const publicationFormSchema = Schema.toStandardSchemaV1(PublicationRequest)

/** Where a map stands with the catalog, as its owner sees it */
export type CatalogState = "none" | "pending" | "declined" | "published"

const sharesAtom = Atom.family((id: PathId) =>
  appRuntime.atom(programs.listShares(id)).pipe(Atom.withReactivity([ReactivityKeys.shares]))
)

/**
 * A visibility just set, shown before the open map hears of it: the map's sync session holds the path as it was
 * read, and the dialog should not flip back when opened again
 */
const visibilityAtom = Atom.family((_: PathId) => Atom.keepAlive(Atom.make<PathVisibility | null>(null)))

/** Where the map stands with the catalog after the owner asked or withdrew here, for the same reason */
const catalogAtom = Atom.family((_: PathId) => Atom.keepAlive(Atom.make<CatalogState | null>(null)))

export type SharesState =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "ready"; readonly shared: SharedWith }

/** The people the owner invited to a map, and the emails waiting for a sign up */
export function useShares(pathId: string): SharesState {
  const hydrated = useHydrated()
  const result = useAtomValue(sharesAtom(PathId.make(pathId)))
  if (!hydrated) return { status: "loading" }
  return AsyncResult.match(result, {
    onInitial: (): SharesState => ({ status: "loading" }),
    onFailure: (): SharesState => ({ status: "failed" }),
    onSuccess: ({ value }): SharesState => ({ status: "ready", shared: value })
  })
}

/** Shares by email or changes the role: with the account, or as an invite; resolves to it, or to the message to show */
export function useSharePath(): (pathId: string, email: string, role: MemberRole) => Promise<ActionResult<ShareResult>> {
  return useAction(actions.sharePath, [ReactivityKeys.shares])
}

/** Drops an invite still waiting for a sign up; resolves to null, or to the message to show */
export function useCancelInvite(): (pathId: string, email: string) => Promise<string | null> {
  const cancel = useAction(actions.cancelInvite, [ReactivityKeys.shares])
  return async (pathId, email) => {
    const result = await cancel(pathId, email)
    return result.ok ? null : result.message
  }
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
export function useSetVisibility(): (pathId: string, visibility: LinkVisibility) => Promise<string | null> {
  const set = useAction(actions.setPathVisibility, [ReactivityKeys.paths])
  const registry = useContext(RegistryContext)
  return async (pathId, visibility) => {
    const result = await set(pathId, visibility)
    if (!result.ok) return result.message
    registry.set(visibilityAtom(PathId.make(pathId)), visibility)
    // A private map leaves the catalog and drops its request
    if (visibility === "private") registry.set(catalogAtom(PathId.make(pathId)), "none")
    return null
  }
}

/** Where the map stands with the catalog: not asked, waiting, declined or published */
export function useCatalog(path: Path): CatalogState {
  const set = useAtomValue(catalogAtom(path.id))
  const visibility = useVisibility(path)
  if (set !== null) return set
  if (visibility === "published") return "published"
  return path.publication ?? "none"
}

/** Asks to publish the map, or saves what the catalog shows of a published one; resolves to null, or to the message */
export function useRequestPublication(): (path: Path, request: PublicationRequest, current: CatalogState) => Promise<string | null> {
  const ask = useAction(actions.requestPublication, [ReactivityKeys.paths])
  const registry = useContext(RegistryContext)
  return async (path, request, current) => {
    const result = await ask(path.id, request)
    if (!result.ok) return result.message
    registry.set(catalogAtom(path.id), current === "published" ? "published" : "pending")
    return null
  }
}

/** Withdraws the request, or takes the map out of the catalog, readable by its link; resolves to null, or to the message */
export function useWithdrawPublication(): (path: Path, current: CatalogState) => Promise<string | null> {
  const withdraw = useAction(actions.withdrawPublication, [ReactivityKeys.paths])
  const registry = useContext(RegistryContext)
  return async (path, current) => {
    const result = await withdraw(path.id)
    if (!result.ok) return result.message
    registry.set(catalogAtom(path.id), "none")
    if (current === "published") registry.set(visibilityAtom(path.id), "public")
    return null
  }
}

/** An administrator approves or declines a request to publish; resolves to null, or to the message to show */
export function useDecidePublication(): (pathId: string, approve: boolean) => Promise<string | null> {
  const decide = useAction(actions.decidePublication, [])
  return async (pathId, approve) => {
    const result = await decide(pathId, approve)
    return result.ok ? null : result.message
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

/** Adds a public map to the learner's maps, to study it with their own marks; resolves to null, or to the message to show */
export function useTakePath(): (pathId: string) => Promise<string | null> {
  const take = useAction(actions.takePath, [ReactivityKeys.paths])
  return async (pathId) => {
    const result = await take(pathId)
    return result.ok ? null : result.message
  }
}
