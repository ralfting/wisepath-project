import { describe, expect, it } from "vitest"
import { AsyncResult, Atom } from "effect/reactivity"
import type { AtomRegistry } from "effect/reactivity"
import { ProjectId } from "@wisepath/domain/projects"
import type { Project } from "@wisepath/domain/projects"
import { MemoryProjectRepository } from "@/infrastructure/projects/MemoryProjectRepository"
import { ReactivityKeys, appRuntime } from "./runtime"
import { testRegistry } from "./testing"
import * as programs from "./projects/programs"

/**
 * Pins how use-case atoms are tested: the runtime's Layer swapped per registry.
 * It leans on how Atom.runtime builds its Layer, so an Effect upgrade that
 * changes that fails here first.
 */

// Built like the ones in projects/projects.ts
const listAtom = appRuntime.atom(programs.listProjects).pipe(Atom.withReactivity([ReactivityKeys.projects]))
const createAtom = appRuntime.fn(programs.createProject, { reactivityKeys: [ReactivityKeys.projects] })

const general = { id: ProjectId.make("general"), name: "General", isDefault: true }

/** The atom's value once it stops waiting */
async function settled<A, E>(registry: AtomRegistry.AtomRegistry, atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const result = registry.get(atom)
    if (!AsyncResult.isInitial(result) && !result.waiting) return result
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error("The atom never settled")
}

const names = (result: AsyncResult.AsyncResult<ReadonlyArray<Project>, unknown>) =>
  AsyncResult.isSuccess(result) ? result.value.map((p) => p.name) : result

describe("testRegistry", () => {
  it("runs reads and mutations on the test Layers, and a mutation refreshes what it changed", async () => {
    const registry = testRegistry(MemoryProjectRepository([general]))
    registry.mount(listAtom)
    registry.mount(createAtom)
    expect(names(await settled(registry, listAtom))).toEqual(["General"])

    registry.set(createAtom, "Languages")
    expect(AsyncResult.isSuccess(await settled(registry, createAtom))).toBe(true)
    expect(names(await settled(registry, listAtom))).toEqual(["General", "Languages"])
  })

  it("gives each registry its own data", async () => {
    const one = testRegistry(MemoryProjectRepository([general]))
    const other = testRegistry(MemoryProjectRepository([]))
    one.mount(listAtom)
    other.mount(listAtom)
    expect(names(await settled(one, listAtom))).toEqual(["General"])
    expect(names(await settled(other, listAtom))).toEqual([])
  })
})
