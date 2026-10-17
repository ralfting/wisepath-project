import { Layer } from "effect"
import { AtomRegistry, Reactivity } from "effect/reactivity"
import { appRuntime } from "./runtime"

/**
 * The atoms' initial values that run every use case on the given Layers
 * instead of the app's: pass them to RegistryProvider's initialValues (or to
 * AtomRegistry.make). Reactivity goes back in because Atom.runtime adds it to
 * the Layer this replaces; without it, every mutation with reactivityKeys dies.
 */
export const testRuntime = <ROut, E>(layer: Layer.Layer<ROut, E>) =>
  [[appRuntime.layer, Layer.provideMerge(layer, Reactivity.layer)]] as const

/** A registry of its own, on the given Layers, for testing atoms without React */
export const testRegistry = <ROut, E>(layer: Layer.Layer<ROut, E>) => AtomRegistry.make({ initialValues: testRuntime(layer) })
