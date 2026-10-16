"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"

/**
 * Pages opened recently, across paths: kept in this browser (local storage),
 * per viewer, for the search palette to offer before anything is typed. Each
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

const STORAGE_KEY = "wisepath:recent-pages"

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

// The list in memory, read once; written through, and told about writes from other tabs
let current: ReadonlyArray<RecentPage> | null = null
const listeners = new Set<() => void>()
const EMPTY: ReadonlyArray<RecentPage> = []

function read(): ReadonlyArray<RecentPage> {
  if (current) return current
  try {
    current = parseRecent(localStorage.getItem(STORAGE_KEY))
  } catch {
    // Storage can be unavailable (private windows, blocked site data): the list lasts until reload
    current = []
  }
  return current
}

function write(list: ReadonlyArray<RecentPage>) {
  current = list
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Kept in memory only
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return
    current = parseRecent(event.newValue)
    listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/** The pages opened most recently, newest first */
export function useRecentPages(): ReadonlyArray<RecentPage> {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}

/** Remembers the page as opened, and again whenever its titles change while it is open */
export function useRememberOpened(page: Omit<RecentPage, "openedAt">): void {
  const { pathId, pageId, title, pathTitle } = page
  const remember = useCallback(
    () => write(rememberOpened(read(), { pathId, pageId, title, pathTitle }, Date.now())),
    [pathId, pageId, title, pathTitle]
  )
  useEffect(remember, [remember])
}
