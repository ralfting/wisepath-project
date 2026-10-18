"use client"

import { useEffect, useRef } from "react"
import { AsyncResult, Atom } from "effect/reactivity"
import { useAtomValue } from "@effect/atom-react"
import type { AccessNotice } from "@wisepath/domain/paths"
import { ReactivityKeys, appRuntime } from "../runtime"
import * as actions from "./actions"
import * as programs from "./programs"

/** The notices waiting for the learner, read again when the session changes */
const noticesAtom = appRuntime.atom(programs.listNotices).pipe(Atom.withReactivity([ReactivityKeys.session]))

/**
 * Shows each notice of a path the learner lost once, then dismisses it. A notice that fails to dismiss shows again
 * next time, which is better than never
 */
export function useAccessNotices(show: (notice: AccessNotice) => void): void {
  const result = useAtomValue(noticesAtom)
  // Each notice once, even when the effect runs twice (React's strict mode) before it is dismissed
  const shown = useRef(new Set<string>())
  const showLatest = useRef(show)
  showLatest.current = show

  useEffect(() => {
    if (!AsyncResult.isSuccess(result)) return
    for (const notice of result.value) {
      if (shown.current.has(notice.id)) continue
      shown.current.add(notice.id)
      showLatest.current(notice)
      void actions.dismissNotice(notice.id)
    }
  }, [result])
}
