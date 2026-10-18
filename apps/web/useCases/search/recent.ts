"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
import { useSession } from "../auth/session"

/**
 * Pages opened recently, across paths: kept in this browser (local storage),
 * one list per account, for the search palette to offer before anything is typed. Each
 * keeps the titles it was last seen with, so the list shows without asking
 * the API.
 */

export interface RecentPage {
  readonly pathId: string
  readonly pageId: string
  readonly title: string
  readonly pathTitle: string
  /** When it was last opened, in ms since the epoch */
  readonly openedAt: number
}

/** How many are kept */
export const RECENT_MAX = 8

/** Where one account's list is kept: a browser shared by two learners never shows one the other's pages */
export const storageKey = (userId: string) => `wisepath:recent-pages:${userId}`

// The single list every account on a browser once shared: removed on first read, it showed one learner's pages to the next
const SHARED_KEY = "wisepath:recent-pages"

/** The list with this page opened now: at the top, once, the oldest dropped past the limit */
export function rememberOpened(
  list: ReadonlyArray<RecentPage>,
  page: Omit<RecentPage, "openedAt">,
  now: number,
  max = RECENT_MAX
): ReadonlyArray<RecentPage> {
  const others = list.filter((p) => !(p.pathId === page.pathId && p.pageId === page.pageId))
  return [{ ...page, openedAt: now }, ...others].slice(0, max)
}

/** What was stored, keeping only entries that still look right (storage is anyone's to edit) */
export function parseRecent(raw: string | null): ReadonlyArray<RecentPage> {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value
      .filter(
        (p): p is RecentPage =>
          !!p &&
          typeof p.pathId === "string" &&
          typeof p.pageId === "string" &&
          typeof p.title === "string" &&
          typeof p.pathTitle === "string" &&
          typeof p.openedAt === "number"
      )
      .slice(0, RECENT_MAX)
  } catch {
    return []
  }
}

// The signed-in account's list in memory, read once; written through, and told about writes from other tabs
let current: { readonly key: string; readonly list: ReadonlyArray<RecentPage> } | null = null
const listeners = new Set<() => void>()
const EMPTY: ReadonlyArray<RecentPage> = []

function read(key: string): ReadonlyArray<RecentPage> {
  if (current?.key === key) return current.list
  let list: ReadonlyArray<RecentPage> = []
  try {
    localStorage.removeItem(SHARED_KEY)
    list = parseRecent(localStorage.getItem(key))
  } catch {
    // Storage can be unavailable (private windows, blocked site data): the list lasts until reload
  }
  current = { key, list }
  return list
}

function write(key: string, list: ReadonlyArray<RecentPage>) {
  current = { key, list }
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // Kept in memory only
  }
  listeners.forEach((listener) => listener())
}

function subscribe(key: string, listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== key) return
    current = { key, list: parseRecent(event.newValue) }
    listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/** The signed-in account's storage key, none while nobody is */
function useStorageKey(): string | null {
  const session = useSession()
  return session.status === "signedIn" ? storageKey(session.user.id) : null
}

/** The pages the signed-in account opened most recently, newest first */
export function useRecentPages(): ReadonlyArray<RecentPage> {
  const key = useStorageKey()
  const subscribeToKey = useCallback((listener: () => void) => (key ? subscribe(key, listener) : () => {}), [key])
  const snapshot = useCallback(() => (key ? read(key) : EMPTY), [key])
  return useSyncExternalStore(subscribeToKey, snapshot, () => EMPTY)
}

/** Remembers the page as opened for the signed-in account, and again whenever its titles change while it is open */
export function useRememberOpened(page: Omit<RecentPage, "openedAt">): void {
  const key = useStorageKey()
  const { pathId, pageId, title, pathTitle } = page
  const remember = useCallback(() => {
    if (key) write(key, rememberOpened(read(key), { pathId, pageId, title, pathTitle }, Date.now()))
  }, [key, pathId, pageId, title, pathTitle])
  useEffect(remember, [remember])
}
