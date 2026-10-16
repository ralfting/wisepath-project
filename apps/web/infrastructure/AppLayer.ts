import { Layer } from "effect"
import { ApiAuth } from "./auth/ApiAuth"
import { HttpInbox } from "./inbox/HttpInbox"
import { HttpLinkPreviews } from "./links/HttpLinkPreviews"
import { HttpProjectRepository } from "./projects/HttpProjectRepository"
import { HttpPageSearch } from "./search/HttpPageSearch"

/** Every service the web app runs with, wired to their real implementations */
export const AppLayer = Layer.mergeAll(ApiAuth, HttpProjectRepository, HttpLinkPreviews, HttpPageSearch, HttpInbox)
