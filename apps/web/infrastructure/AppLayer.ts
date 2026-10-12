import { Layer } from "effect"
import { ApiAuth } from "./auth/ApiAuth"

/** Every service the web app runs with, wired to their real implementations */
export const AppLayer = Layer.mergeAll(ApiAuth)
