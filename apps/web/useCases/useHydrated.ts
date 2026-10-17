"use client"

import { useSyncExternalStore } from "react"

const noSubscription = () => () => {}

/**
 * False on the server and during hydration, true afterwards. What loads in the browser (the session cookie belongs
 * to the API) says "loading" in both renders, so they agree.
 */
export const useHydrated = () => useSyncExternalStore(noSubscription, () => true, () => false)
