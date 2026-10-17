"use client"

import { useAtomSet } from "@effect/atom-react"
import type { ActionResult } from "./actionResult"
import { invalidateAtom } from "./runtime"

/** Runs a Server Action, then refreshes what it changed on the client (its ReactivityKeys) when it worked */
export function useAction<Args extends ReadonlyArray<unknown>, A>(
  action: (...args: Args) => Promise<ActionResult<A>>,
  changes: ReadonlyArray<string>
): (...args: Args) => Promise<ActionResult<A>> {
  const invalidate = useAtomSet(invalidateAtom)
  return async (...args) => {
    const result = await action(...args)
    if (result.ok) invalidate(changes)
    return result
  }
}
