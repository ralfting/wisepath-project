"use client"

import { useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { AsyncResult, Atom } from "effect/reactivity"
import { RegistryContext, useAtomSet, useAtomValue } from "@effect/atom-react"
import { ProjectId } from "@wisepath/domain/projects"
import type { DueCard, Grade, PathCards, ReviewCounts } from "@wisepath/domain/review"
import { useT } from "@/i18n/I18nProvider"
import { ReactivityKeys, appRuntime } from "../runtime"
import { messageFor } from "../messages"
import { useProjects } from "../projects"
import * as programs from "./programs"
import { gradeCard, startSitting } from "./queue"
import type { Sitting } from "./queue"

/**
 * Review use cases for the Review page, the sidebar and a path's cards.
 * Cards are read from the pages by the API, so the counts are asked again
 * after a grade and once edits to the pages have had time to be saved.
 */

const countsAtom = appRuntime.atom(programs.counts).pipe(Atom.withReactivity([ReactivityKeys.review, ReactivityKeys.session]))
const dueAtom = Atom.family((projectId: string) => appRuntime.atom(programs.dueCards(projectId ? ProjectId.make(projectId) : null)))
const gradeAtom = appRuntime.fn(programs.grade, { reactivityKeys: [ReactivityKeys.review] })

/** Edits reach the API a moment after typing pauses; the counts are asked again after that */
const RECOUNT_AFTER = 2000

const noSubscription = () => () => {}
const useHydrated = () => useSyncExternalStore(noSubscription, () => true, () => false)

/** Today's counts, overall and per path; null until loaded. Kept in step with edits to the pages */
export function useReviewCounts(): ReviewCounts | null {
  const hydrated = useHydrated()
  const registry = useContext(RegistryContext)
  const counts = useAtomValue(countsAtom, (result) => (AsyncResult.isSuccess(result) ? result.value : null))
  const projects = useProjects()
  const first = useRef(true)
  useEffect(() => {
    // The first list of paths is what the counts were read with
    if (first.current) {
      first.current = projects === null
      return
    }
    const timer = window.setTimeout(() => registry.refresh(countsAtom), RECOUNT_AFTER)
    return () => window.clearTimeout(timer)
  }, [projects, registry])
  return hydrated ? counts : null
}

/** One path's cards and how many are due; null until loaded or when it has none */
export function usePathCards(projectId: string): PathCards | null {
  const counts = useReviewCounts()
  return counts?.paths.find((p) => p.projectId === projectId) ?? null
}

export type ReviewSitting =
  | { readonly status: "loading" }
  | { readonly status: "unavailable" }
  | {
      readonly status: "ready"
      /** The card on screen; null once every card is done */
      readonly card: DueCard | null
      /** Cards left, the one on screen included */
      readonly left: number
      readonly reviewed: number
      /** Grades the card on screen and shows the next at once */
      readonly grade: (grade: Grade) => void
      /** Why a grade couldn't be saved, in the current language */
      readonly notice: string | null
    }

/** A sitting of today's cards, in one path (its id) or every one (null) */
export function useReviewSitting(projectId: string | null): ReviewSitting {
  const hydrated = useHydrated()
  const due = useAtomValue(dueAtom(projectId ?? ""))
  const send = useAtomSet(gradeAtom, { mode: "promiseExit" })
  const t = useT()
  const [sitting, setSitting] = useState<Sitting | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // A new sitting whenever the cards are (re)loaded or another path is picked
  useEffect(() => {
    setSitting(AsyncResult.isSuccess(due) ? startSitting(due.value) : null)
  }, [due])

  const grade = useCallback(
    (value: Grade) => {
      if (!sitting) return
      const card = sitting.cards[0]
      const next = gradeCard(sitting, value, new Date())
      if (!card || !next) return
      setSitting(next.sitting)
      setNotice(null)
      void send({ cardId: card.id, grade: value, reps: card.state?.reps ?? 0 }).then((exit) => {
        // A card whose line was edited meanwhile is simply gone; nothing to tell
        const message = messageFor(exit, { CardNotFound: "", ReviewUnavailable: t("review.errors.notSaved") }, t("review.errors.notSaved"))
        if (message) setNotice(message)
      })
    },
    [sitting, send, t]
  )

  if (!hydrated || AsyncResult.isInitial(due)) return { status: "loading" }
  if (AsyncResult.isFailure(due)) return { status: "unavailable" }
  if (!sitting) return { status: "loading" }
  return { status: "ready", card: sitting.cards[0] ?? null, left: sitting.cards.length, reviewed: sitting.reviewed, grade, notice }
}
