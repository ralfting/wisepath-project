"use client"

import { AsyncResult, Atom } from "effect/reactivity"
import type { AtomRegistry } from "effect/reactivity"
import type { PathId } from "@wisepath/domain/paths"
import { appRuntime } from "../runtime"
import { openPathSession } from "./sync"
import type { PathSession, SyncState } from "./sync"

/** The open maps' sync sessions (sync.ts), shared by the map, the list of maps and the Inbox */

/** One session per open map, kept while the app runs so going back is instant */
export const sessionAtom = Atom.family((id: PathId) => Atom.keepAlive(appRuntime.atom(openPathSession(id))))

/** The session's state as an atom, made once per session */
const stateAtoms = new WeakMap<PathSession, Atom.Atom<SyncState>>()
export const stateAtomOf = (session: PathSession) => {
  let atom = stateAtoms.get(session)
  if (!atom) {
    atom = Atom.subscriptionRef(session.state)
    stateAtoms.set(session, atom)
  }
  return atom
}

/** Maps opened in this tab, so the list of maps shows their latest progress without asking the API again */
export const openedAtom = Atom.keepAlive(Atom.make(new Set<PathId>() as ReadonlySet<PathId>))

/** Resolves with an atom's first settled value: its success, or null when it fails */
export function settledValue<A>(registry: AtomRegistry.AtomRegistry, atom: Atom.Atom<AsyncResult.AsyncResult<A, unknown>>): Promise<A | null> {
  return new Promise((resolve) => {
    let settled = false
    let stop = () => {}
    stop = registry.subscribe(atom, (result) => {
      if (settled || AsyncResult.isInitial(result) || result.waiting) return
      settled = true
      resolve(AsyncResult.isSuccess(result) ? result.value : null)
      queueMicrotask(stop)
    }, { immediate: true })
    if (settled) stop()
  })
}
