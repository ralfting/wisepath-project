import { Atom } from "effect/reactivity"
import { AppLayer } from "@/infrastructure/AppLayer"

/** Runtime every use case's atoms run on: the app's services, built once per registry */
export const appRuntime = Atom.runtime(AppLayer)

/** Reactivity keys: writing one refreshes every atom that reads it */
export const ReactivityKeys = {
  session: "session",
  projects: "projects",
  review: "review"
} as const
