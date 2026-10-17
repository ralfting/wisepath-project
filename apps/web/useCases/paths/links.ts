"use client"

import { useCallback, useContext } from "react"
import { Option } from "effect"
import { AsyncResult, Atom } from "effect/reactivity"
import { RegistryContext, useAtomValue } from "@effect/atom-react"
import type { LinkPreview } from "@wisepath/domain/paths"
import { appRuntime } from "../runtime"
import * as programs from "./programs"

/** Previews of external links written in the pages, looked up once per URL */

const linkPreviewAtom = Atom.family((url: string) => appRuntime.atom(programs.previewLink(url)))

export type LinkPreviewState =
  | { readonly status: "loading" }
  | { readonly status: "none" }
  | { readonly status: "ready"; readonly preview: LinkPreview }

/** Preview of an external link; looked up once per URL */
export function useLinkPreview(url: string): LinkPreviewState {
  return useAtomValue(linkPreviewAtom(url), (result): LinkPreviewState =>
    AsyncResult.isSuccess(result)
      ? Option.match(result.value, {
          onNone: () => ({ status: "none" }),
          onSome: (preview) => ({ status: "ready", preview })
        })
      : AsyncResult.isFailure(result)
        ? { status: "none" }
        : { status: "loading" }
  )
}

/**
 * Looks up previews outside React (the editor's compact links): the same
 * lookups, and the same cache, as useLinkPreview. Resolves to null when a page
 * can't be previewed
 */
export function useLinkPreviewLoader(): (url: string) => Promise<LinkPreview | null> {
  const registry = useContext(RegistryContext)
  return useCallback(
    (url) =>
      new Promise((resolve) => {
        const atom = linkPreviewAtom(url)
        const settle = (result: AsyncResult.AsyncResult<Option.Option<LinkPreview>, unknown>) => {
          if (AsyncResult.isSuccess(result)) resolve(Option.getOrNull(result.value))
          else if (AsyncResult.isFailure(result)) resolve(null)
          else return false
          return true
        }
        let stop = () => {}
        let settled = false
        stop = registry.subscribe(atom, (result) => {
          if (!settled && settle(result)) {
            settled = true
            queueMicrotask(stop)
          }
        }, { immediate: true })
        if (settled) stop()
      }),
    [registry]
  )
}
