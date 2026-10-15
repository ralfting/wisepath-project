import { Layer } from "effect"
import { ApiAuth } from "./auth/ApiAuth"
import { HttpLinkPreviews } from "./links/HttpLinkPreviews"
import { HttpProjectRepository } from "./projects/HttpProjectRepository"
import { HttpReviews } from "./review/HttpReviews"
import { HttpPageSearch } from "./search/HttpPageSearch"

/** Every service the web app runs with, wired to their real implementations */
export const AppLayer = Layer.mergeAll(ApiAuth, HttpProjectRepository, HttpLinkPreviews, HttpReviews, HttpPageSearch)
