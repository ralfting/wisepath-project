import { Layer } from "effect"
import { ApiAuth } from "./auth/ApiAuth"
import { HttpInbox } from "./inbox/HttpInbox"
import { HttpLinkPreviews } from "./links/HttpLinkPreviews"
import { HttpPathRepository } from "./paths/HttpPathRepository"
import { HttpProjectRepository } from "./projects/HttpProjectRepository"
import { HttpPageSearch } from "./search/HttpPageSearch"

/** Every service the web app runs with, wired to their real implementations */
export const AppLayer = Layer.mergeAll(ApiAuth, HttpProjectRepository, HttpPathRepository, HttpLinkPreviews, HttpPageSearch, HttpInbox)
