import { Layer } from "effect"
import { ApiAuth } from "./auth/ApiAuth"
import { HttpLinkPreviews } from "./links/HttpLinkPreviews"
import { LocalProjectRepository } from "./projects/LocalProjectRepository"

/** Every service the web app runs with, wired to their real implementations */
export const AppLayer = Layer.mergeAll(ApiAuth, LocalProjectRepository, HttpLinkPreviews)
