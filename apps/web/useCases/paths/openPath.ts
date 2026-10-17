"use client"

import { useCallback, useContext } from "react"
import { RegistryContext } from "@effect/atom-react"
import { PathId } from "@wisepath/domain/paths"
import type { Path } from "@wisepath/domain/paths"
import { openedAtom, sessionAtom, settledValue, stateAtomOf } from "./sessions"
import type { Command } from "./sync"

/** A map changed from outside its own screen (filing from the Inbox), through the same session as the map */
export interface OpenPath {
  /** The map as it is now, with the changes on their way */
  readonly path: () => Path
  /** Applies a change right away and sends it; false when it can't apply */
  readonly dispatch: (command: Command) => boolean
  /** Resolves once every change so far reached the API: true, or false when the API refused one */
  readonly saved: () => Promise<boolean>
}

/** Opens any of the learner's maps for changes, loading it when it isn't open; null when it can't be loaded */
export function useOpenPath(): (pathId: string) => Promise<OpenPath | null> {
  const registry = useContext(RegistryContext)
  return useCallback(
    async (pathId) => {
      const id = PathId.make(pathId)
      const session = await settledValue(registry, sessionAtom(id))
      if (!session) return null
      const opened = registry.get(openedAtom)
      if (!opened.has(id)) registry.set(openedAtom, new Set([...opened, id]))
      const state = stateAtomOf(session)
      return {
        path: () => registry.get(state).path,
        dispatch: session.dispatch,
        saved: () =>
          new Promise<boolean>((resolve) => {
            let done = false
            let stop = () => {}
            stop = registry.subscribe(state, (sync) => {
              if (done || sync.status !== "saved") return
              done = true
              resolve(sync.notice === null)
              queueMicrotask(stop)
            }, { immediate: true })
            if (done) stop()
          })
      }
    },
    [registry]
  )
}
