"use client"

import { useEffect, useState } from "react"
import { Schema } from "effect"

/** The projects folded on My paths, remembered on this device like the sidebar */

const STORAGE_KEY = "wisepath:collapsed-projects"

const Folded = Schema.Array(Schema.String)

/** What was stored, when it still looks right (storage is anyone's to edit); nothing folded otherwise */
const read = (): ReadonlySet<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const decoded = Schema.decodeUnknownOption(Schema.fromJsonString(Folded))(raw ?? "[]")
    return new Set(decoded._tag === "Some" ? decoded.value : [])
  } catch {
    // Storage can be unavailable (private windows, blocked site data)
    return new Set()
  }
}

/** Which projects are folded, and folding or unfolding one; the choice outlives a reload on this device */
export function useCollapsedProjects() {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  // After the first render: the server renders every project open, and the page must match it before folding
  useEffect(() => setCollapsed(read()), [])

  const toggle = (projectId: string) => {
    const next = new Set(collapsed)
    if (next.has(projectId)) next.delete(projectId)
    else next.add(projectId)
    setCollapsed(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
    } catch {
      // The choice lasts until reload
    }
  }

  return { collapsed, toggle }
}
