"use client"

import { RegistryProvider } from "@effect/atom-react"
import type { ReactNode } from "react"

/** Holds the atoms every use-case hook reads; mount once near the root */
export function UseCasesProvider({ children }: { children: ReactNode }) {
  return <RegistryProvider>{children}</RegistryProvider>
}
