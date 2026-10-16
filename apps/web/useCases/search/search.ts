"use client"

import { useMemo } from "react"
import { Effect } from "effect"
import { AsyncResult, Atom } from "effect/reactivity"
import { useAtom, useAtomRefresh, useAtomValue } from "@effect/atom-react"
import { PageSearch } from "@wisepath/domain/search"
import type { SearchHit } from "@wisepath/domain/search"
import { appRuntime } from "../runtime"

/**
 * Search everywhere: what is typed in the palette, searched across every
 * path once typing pauses (150 ms), so each key doesn't ask the API.
 */

/** What was typed, kept while the app runs */
const queryAtom = Atom.keepAlive(Atom.make(""))
const debouncedAtom = queryAtom.pipe(Atom.debounce("150 millis"))

interface Found {
  /** The query these are for, which may lag behind what is typed */
  readonly query: string
  readonly hits: ReadonlyArray<SearchHit>
}

const foundAtom = appRuntime.atom((get) => {
  const query = get(debouncedAtom).trim()
  if (!query) return Effect.succeed<Found>({ query, hits: [] })
  return PageSearch.use((search) => search.search(query)).pipe(
    Effect.map((hits): Found => ({ query, hits })),
    Effect.withSpan("useCases.search.pages")
  )
})

export type PageSearchState =
  /** Nothing typed: the palette shows the recent pages */
  | { readonly status: "idle" }
  /** The first answer for what is typed is on its way */
  | { readonly status: "loading" }
  /** `stale` while a newer query is being searched: the results stay until it answers */
  | { readonly status: "ready"; readonly query: string; readonly hits: ReadonlyArray<SearchHit>; readonly stale: boolean }
  | { readonly status: "unavailable" }

export function usePageSearch(): {
  readonly query: string
  readonly setQuery: (query: string) => void
  readonly state: PageSearchState
  readonly retry: () => void
} {
  const [query, setQuery] = useAtom(queryAtom)
  const found = useAtomValue(foundAtom)
  const retry = useAtomRefresh(foundAtom)
  const typed = query.trim()

  // The same object until what it says changes: the palette resets its marked row whenever the state is new
  const state = useMemo(
    (): PageSearchState =>
      !typed
        ? { status: "idle" }
        : AsyncResult.isFailure(found)
          ? { status: "unavailable" }
          : AsyncResult.isSuccess(found) && found.value.query
            ? { status: "ready", ...found.value, stale: found.waiting || found.value.query !== typed }
            : { status: "loading" },
    [typed, found]
  )

  return { query, setQuery, state, retry }
}
